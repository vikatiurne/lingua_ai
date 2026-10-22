const DEFAULT_PDF_FILE_NAME = "exercise.pdf";
const OBJECT_URL_REVOKE_DELAY_MS = 1000;

export function parsePdfFileName(contentDisposition: string | null): string {
  if (!contentDisposition) return DEFAULT_PDF_FILE_NAME;

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      // Fall back to the plain filename below.
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || DEFAULT_PDF_FILE_NAME;
}

export async function downloadExercisePdf(exerciseId: string): Promise<void> {
  const response = await fetch(`/api/exercise/${exerciseId}/pdf`);
  if (!response.ok) {
    throw new Error(`PDF request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const fileName = parsePdfFileName(
    response.headers.get("Content-Disposition")
  );

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_REVOKE_DELAY_MS);
}
