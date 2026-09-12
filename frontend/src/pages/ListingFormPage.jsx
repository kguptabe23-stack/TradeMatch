import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { FormField, inputClassName } from "../components/FormField";
import { validateImageFile } from "../lib/imageValidation";

const MAX_PHOTOS = 9;

const CATEGORIES = [
  "Electronics",
  "Books",
  "Gaming",
  "Sports",
  "Fashion",
  "Furniture",
  "Vehicles",
  "Other",
];

const CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
];

let nextLocalId = 0;

export default function ListingFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const isEdit = !!id;
  const isGate = !isEdit && searchParams.get("gate") === "1";

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // New structured listing information
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");

  // Tags describing what the user owns
  const [listingTags, setListingTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");

  // Tags describing what the user wants
  const [wantedTags, setWantedTags] = useState([]);
  const [wantedTagDraft, setWantedTagDraft] = useState("");

  // Each photo:
  // { localId, url, status: "uploading" | "error" | "done", errorMessage }
  const [photos, setPhotos] = useState([]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  const fileInputRef = useRef(null);
  const replacingLocalIdRef = useRef(null);

  // Load existing listing when editing
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const { listing } = await apiFetch(`/api/listings/${id}`);

        setTitle(listing.title || "");
        setDesc(listing.description || "");
        setCategory(listing.category || "");
        setCondition(listing.condition || "");
        setListingTags(listing.tags || []);
        setWantedTags(listing.wantedTags || []);

        setPhotos(
          (listing.imageUrls || []).map((url) => ({
            localId: nextLocalId++,
            url,
            status: "done",
          }))
        );
      } catch (err) {
        setErrors({ form: err.message });
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [id, isEdit]);

  // -----------------------------
  // LISTING TAGS
  // -----------------------------

  function addListingTag() {
    const tag = tagDraft.trim().toLowerCase();

    if (!tag) return;

    setListingTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags
        : [...currentTags, tag]
    );

    setTagDraft("");
  }

  function removeListingTag(tag) {
    setListingTags((currentTags) =>
      currentTags.filter((x) => x !== tag)
    );
  }

  // -----------------------------
  // WANTED TAGS
  // -----------------------------

  function addWantedTag() {
    const tag = wantedTagDraft.trim().toLowerCase();

    if (!tag) return;

    setWantedTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags
        : [...currentTags, tag]
    );

    setWantedTagDraft("");
  }

  function removeWantedTag(tag) {
    setWantedTags((currentTags) =>
      currentTags.filter((x) => x !== tag)
    );
  }

  // -----------------------------
  // PHOTOS
  // -----------------------------

  function pickPhoto(replaceLocalId = null) {
    replacingLocalIdRef.current = replaceLocalId;
    fileInputRef.current?.click();
  }

  function removePhoto(localId) {
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.localId !== localId)
    );
  }

  async function uploadPhoto(localId, file) {
    const validationError = await validateImageFile(file);

    if (validationError) {
      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) =>
          photo.localId === localId
            ? {
                ...photo,
                status: "error",
                errorMessage: validationError,
              }
            : photo
        )
      );

      return;
    }

    try {
      const form = new FormData();
      form.append("file", file);

      const { url } = await apiFetch("/api/uploads/image", {
        method: "POST",
        body: form,
      });

      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) =>
          photo.localId === localId
            ? {
                ...photo,
                status: "done",
                url,
              }
            : photo
        )
      );
    } catch (err) {
      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) =>
          photo.localId === localId
            ? {
                ...photo,
                status: "error",
                errorMessage: err.message,
              }
            : photo
        )
      );
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];

    // Allow selecting the same file again after retry
    e.target.value = "";

    if (!file) return;

    const replaceLocalId = replacingLocalIdRef.current;
    replacingLocalIdRef.current = null;

    if (replaceLocalId !== null) {
      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) =>
          photo.localId === replaceLocalId
            ? { ...photo, status: "uploading" }
            : photo
        )
      );

      uploadPhoto(replaceLocalId, file);
    } else {
      const localId = nextLocalId++;

      setPhotos((currentPhotos) => [
        ...currentPhotos,
        {
          localId,
          url: null,
          status: "uploading",
        },
      ]);

      uploadPhoto(localId, file);
    }
  }

  // -----------------------------
  // SUBMIT
  // -----------------------------

  async function handleSubmit(e) {
    e.preventDefault();

    const doneUrls = photos
      .filter((photo) => photo.status === "done")
      .map((photo) => photo.url);

    const stillUploading = photos.some(
      (photo) => photo.status === "uploading"
    );

    const errs = {};

    if (!title.trim()) {
      errs.title = "Title is required";
    }

    if (!desc.trim()) {
      errs.desc = "Description is required";
    }

    if (!category) {
      errs.category = "Category is required";
    }

    if (!condition) {
      errs.condition = "Condition is required";
    }

    if (stillUploading) {
      errs.image = "Wait for your photos to finish uploading";
    } else if (doneUrls.length === 0) {
      errs.image = "Add at least one photo to continue";
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: desc.trim(),
        category,
        condition,
        tags: listingTags,
        wantedTags,
        imageUrls: doneUrls,
      };

      if (isEdit) {
        await apiFetch(`/api/listings/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        navigate("/listings");
      } else {
        await apiFetch("/api/listings", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        navigate(isGate ? "/feed" : "/listings");
      }
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="h-14 shrink-0 flex items-center px-4 border-b border-[#EEE] relative">
        {!isGate && (
          <button
            type="button"
            onClick={() => navigate("/listings")}
            className="w-8 h-8 rounded-full border border-[#E5E5E5] bg-white flex items-center justify-center cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path
                d="M15 4L7 12L15 20"
                stroke="#333"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        )}

        <span className="font-poppins font-bold text-base text-[#121212] absolute left-1/2 -translate-x-1/2">
          {isEdit ? "Edit listing" : "New listing"}
        </span>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="px-6 pt-6 pb-8 flex flex-col gap-4"
      >
        {isGate && (
          <div>
            <div className="font-poppins font-bold text-[19px] text-[#121212]">
              List something to start browsing
            </div>

            <div className="text-[13px] text-[#777] mt-1.5 leading-normal">
              Trades work both ways — add one item you&apos;re willing to swap,
              and you&apos;ll unlock the feed.
            </div>
          </div>
        )}

        {/* TITLE */}
        <FormField label="Title" error={errors.title}>
          <input
            className={inputClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sony WH-1000XM5"
          />
        </FormField>

        {/* DESCRIPTION */}
        <FormField label="Description" error={errors.desc}>
          <textarea
            className="rounded-[10px] border-[1.5px] border-[#E2E2E2] px-3.5 py-2.5 text-sm outline-none resize-none focus:border-brand-teal w-full"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Condition, details, why you're trading it"
          />
        </FormField>

        {/* CATEGORY */}
        <FormField label="Category" error={errors.category}>
          <select
            className={inputClassName}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category</option>

            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>

        {/* CONDITION */}
        <FormField label="Condition" error={errors.condition}>
          <select
            className={inputClassName}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="">Select condition</option>

            {CONDITIONS.map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </FormField>

        {/* WHAT I HAVE */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#444]">
            What are you offering?
          </label>

          <div className="flex gap-2">
            <input
              className="flex-1 h-10 rounded-[10px] border-[1.5px] border-[#E2E2E2] px-3 text-[13px] outline-none focus:border-brand-teal"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addListingTag();
                }
              }}
              placeholder="e.g. wireless"
            />

            <button
              type="button"
              onClick={addListingTag}
              className="h-10 px-4 rounded-[10px] border-[1.5px] border-brand-teal bg-white text-brand-teal font-semibold text-[13px] cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {listingTags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[#E6F7F5] text-[#00786D] rounded-full px-2.5 py-1.25 flex items-center gap-1.5"
              >
                {tag}

                <button
                  type="button"
                  onClick={() => removeListingTag(tag)}
                  className="cursor-pointer font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* WHAT I WANT */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#444]">
            What do you want in return?
          </label>

          <div className="flex gap-2">
            <input
              className="flex-1 h-10 rounded-[10px] border-[1.5px] border-[#E2E2E2] px-3 text-[13px] outline-none focus:border-brand-teal"
              value={wantedTagDraft}
              onChange={(e) => setWantedTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addWantedTag();
                }
              }}
              placeholder="e.g. airpods"
            />

            <button
              type="button"
              onClick={addWantedTag}
              className="h-10 px-4 rounded-[10px] border-[1.5px] border-brand-teal bg-white text-brand-teal font-semibold text-[13px] cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {wantedTags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[#E6F7F5] text-[#00786D] rounded-full px-2.5 py-1.25 flex items-center gap-1.5"
              >
                {tag}

                <button
                  type="button"
                  onClick={() => removeWantedTag(tag)}
                  className="cursor-pointer font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* PHOTOS */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold text-[#444]">
              Photos{" "}
              {photos.length > 0 && `(${photos.length}/${MAX_PHOTOS})`}
            </label>

            <span className="text-[11px] text-[#999]">
              First photo is your cover
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div
                key={photo.localId}
                className="relative aspect-3/4 rounded-xl overflow-hidden bg-[#F5F5F5]"
              >
                {photo.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-[3px] border-[#DDD] border-t-brand-teal animate-spin" />
                  </div>
                )}

                {photo.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1.5 border-[1.5px] border-[#F5C2C2] bg-[#FDECEA] text-center">
                    <span className="text-[10px] text-[#C0392B] leading-tight">
                      {photo.errorMessage}
                    </span>

                    <button
                      type="button"
                      onClick={() => pickPhoto(photo.localId)}
                      className="text-[10px] font-semibold text-brand-teal underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {photo.status === "done" && (
                  <img
                    src={photo.url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {index === 0 && photo.status === "done" && (
                  <span className="absolute top-1 left-1 text-[9px] font-bold text-white bg-black/50 rounded px-1.5 py-0.5">
                    Cover
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removePhoto(photo.localId)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <div
                onClick={() => pickPhoto()}
                className="aspect-3/4 rounded-xl border-2 border-dashed border-[#D8D8D8] flex flex-col items-center justify-center gap-1 cursor-pointer text-[#888]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    d="M12 5V19M5 12H19"
                    stroke="#888"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>

                <span className="text-[11px]">Add photo</span>
              </div>
            )}
          </div>

          {errors.image && (
            <span className="text-xs text-[#DD3333]">
              {errors.image}
            </span>
          )}
        </div>

        {errors.form && (
          <p className="text-xs text-[#DD3333]">
            {errors.form}
          </p>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-brand-coral text-white font-bold text-sm mt-1.5 disabled:opacity-60 cursor-pointer"
        >
          {loading
            ? "Saving…"
            : isGate
              ? "List it — let's go"
              : isEdit
                ? "Save changes"
                : "Create listing"}
        </button>
      </form>
    </>
  );
}