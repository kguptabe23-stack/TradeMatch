export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches Tinder's cap
export const MIN_DIMENSION_PX = 640; // matches Tinder's stated minimum

// Reads the file's actual pixel dimensions before we spend a network round
// trip uploading it — a photo below Tinder's own recommended minimum looks
// bad in a swipe card, so reject it up front rather than after upload.
function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read image"));
    };
    img.src = url;
  });
}

// Returns an error message, or null if the file passes.
export async function validateImageFile(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image must be under 10MB";
  }

  let dimensions;
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    return "Couldn't read that image — try a different file";
  }

  if (dimensions.width < MIN_DIMENSION_PX || dimensions.height < MIN_DIMENSION_PX) {
    return `Image must be at least ${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX}px`;
  }

  return null;
}
