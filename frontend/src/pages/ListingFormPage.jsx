import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { FormField, inputClassName } from "../components/FormField";
import { validateImageFile } from "../lib/imageValidation";

const MAX_PHOTOS = 9; // matches Tinder's own cap

let nextLocalId = 0;

export default function ListingFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const isGate = !isEdit && searchParams.get("gate") === "1";

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  // Each: { localId, url, status: 'uploading' | 'error' | 'done', errorMessage }
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { listing } = await apiFetch(`/api/listings/${id}`);
      setTitle(listing.title);
      setDesc(listing.description);
      setTags(listing.wantedTags || []);
      setPhotos(
        (listing.imageUrls || []).map((url) => ({
          localId: nextLocalId++,
          url,
          status: "done",
        }))
      );
      setLoadingExisting(false);
    })();
  }, [id, isEdit]);

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag) return;
    setTags((t) => (t.includes(tag) ? t : [...t, tag]));
    setTagDraft("");
  }
  function removeTag(tag) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  // When set, the next file-input change replaces this slot in place
  // (used for retrying a failed upload) instead of adding a new one.
  const replacingLocalIdRef = useRef(null);

  function pickPhoto(replaceLocalId = null) {
    replacingLocalIdRef.current = replaceLocalId;
    fileInputRef.current?.click();
  }

  function removePhoto(localId) {
    setPhotos((p) => p.filter((photo) => photo.localId !== localId));
  }

  async function uploadPhoto(localId, file) {
    const validationError = await validateImageFile(file);
    if (validationError) {
      setPhotos((p) =>
        p.map((photo) =>
          photo.localId === localId ? { ...photo, status: "error", errorMessage: validationError } : photo
        )
      );
      return;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await apiFetch("/api/uploads/image", { method: "POST", body: form });
      setPhotos((p) => p.map((photo) => (photo.localId === localId ? { ...photo, status: "done", url } : photo)));
    } catch (err) {
      setPhotos((p) =>
        p.map((photo) =>
          photo.localId === localId ? { ...photo, status: "error", errorMessage: err.message } : photo
        )
      );
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after a retry
    if (!file) return;

    const replaceLocalId = replacingLocalIdRef.current;
    replacingLocalIdRef.current = null;

    if (replaceLocalId !== null) {
      setPhotos((p) => p.map((photo) => (photo.localId === replaceLocalId ? { ...photo, status: "uploading" } : photo)));
      uploadPhoto(replaceLocalId, file);
    } else {
      const localId = nextLocalId++;
      setPhotos((p) => [...p, { localId, url: null, status: "uploading" }]);
      uploadPhoto(localId, file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const doneUrls = photos.filter((p) => p.status === "done").map((p) => p.url);
    const stillUploading = photos.some((p) => p.status === "uploading");

    const errs = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!desc.trim()) errs.desc = "Description is required";
    if (stillUploading) errs.image = "Wait for your photos to finish uploading";
    else if (doneUrls.length === 0) errs.image = "Add at least one photo to continue";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const payload = { title, description: desc, wantedTags: tags, imageUrls: doneUrls };
      if (isEdit) {
        await apiFetch(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        navigate("/listings");
      } else {
        await apiFetch("/api/listings", { method: "POST", body: JSON.stringify(payload) });
        navigate(isGate ? "/feed" : "/listings");
      }
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (loadingExisting) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <>
      <div className="h-14 shrink-0 flex items-center px-4 border-b border-[#EEE] relative">
        {!isGate && (
          <button
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

      <form onSubmit={handleSubmit} className="px-6 pt-6 pb-8 flex flex-col gap-4">
        {isGate && (
          <div>
            <div className="font-poppins font-bold text-[19px] text-[#121212]">
              List something to start browsing
            </div>
            <div className="text-[13px] text-[#777] mt-1.5 leading-normal">
              Trades work both ways — add one item you&apos;re willing to swap, and you&apos;ll unlock the feed.
            </div>
          </div>
        )}

        <FormField label="Title" error={errors.title}>
          <input
            className={inputClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Acoustic guitar"
          />
        </FormField>

        <FormField label="Description" error={errors.desc}>
          <textarea
            className="rounded-[10px] border-[1.5px] border-[#E2E2E2] px-3.5 py-2.5 text-sm outline-none resize-none focus:border-brand-teal"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Condition, details, why you're trading it"
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#444]">What you&apos;d want in return</label>
          <div className="flex gap-2">
            <input
              className="flex-1 h-10 rounded-[10px] border-[1.5px] border-[#E2E2E2] px-3 text-[13px] outline-none focus:border-brand-teal"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="e.g. camera"
            />
            <button
              type="button"
              onClick={addTag}
              className="h-10 px-4 rounded-[10px] border-[1.5px] border-brand-teal bg-white text-brand-teal font-semibold text-[13px] cursor-pointer"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[#E6F7F5] text-[#00786D] rounded-full px-2.5 py-1.25 flex items-center gap-1.5"
              >
                {tag}
                <span onClick={() => removeTag(tag)} className="cursor-pointer font-bold">
                  ×
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold text-[#444]">
              Photos {photos.length > 0 && `(${photos.length}/${MAX_PHOTOS})`}
            </label>
            <span className="text-[11px] text-[#999]">First photo is your cover</span>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={photo.localId} className="relative aspect-3/4 rounded-xl overflow-hidden bg-[#F5F5F5]">
                {photo.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-[3px] border-[#DDD] border-t-brand-teal animate-spin" />
                  </div>
                )}
                {photo.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1.5 border-[1.5px] border-[#F5C2C2] bg-[#FDECEA] text-center">
                    <span className="text-[10px] text-[#C0392B] leading-tight">{photo.errorMessage}</span>
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
                  <img src={photo.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
                  <path d="M12 5V19M5 12H19" stroke="#888" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span className="text-[11px]">Add photo</span>
              </div>
            )}
          </div>

          {errors.image && <span className="text-xs text-[#DD3333]">{errors.image}</span>}
        </div>

        {errors.form && <p className="text-xs text-[#DD3333]">{errors.form}</p>}

        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-brand-coral text-white font-bold text-sm mt-1.5 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Saving…" : isGate ? "List it — let's go" : isEdit ? "Save changes" : "Create listing"}
        </button>
      </form>
    </>
  );
}
