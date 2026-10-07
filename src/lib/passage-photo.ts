import { Platform } from 'react-native';

import { extractPassageFromImage, hasAi } from './ai';

export type PassagePhotoFail = 'canceled' | 'denied' | 'empty' | 'unavailable' | 'no-desk' | 'no-camera';
export type PassagePhotoResult = { ok: true; text: string } | { ok: false; reason: PassagePhotoFail };
export type CapturedPassage = { ok: true; base64: string; mime: string } | { ok: false; reason: Exclude<PassagePhotoFail, 'no-desk'> };

type Picker = typeof import('expo-image-picker');

let pickerModule: Picker | null | undefined;

async function loadPicker(): Promise<Picker | null> {
  if (pickerModule !== undefined) return pickerModule;
  try {
    pickerModule = await import('expo-image-picker');
    return pickerModule;
  } catch {
    pickerModule = null;
    return null;
  }
}

function fileToBase64(file: Blob): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const comma = dataUrl.indexOf(',');
      if (comma < 0) {
        reject(new Error('empty'));
        return;
      }
      const mime = dataUrl.slice(5, dataUrl.indexOf(';')) || file.type || 'image/jpeg';
      resolve({ base64: dataUrl.slice(comma + 1), mime });
    };
    reader.onerror = () => reject(reader.error ?? new Error('empty'));
    reader.readAsDataURL(file);
  });
}

async function captureOnWeb(): Promise<CapturedPassage> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return { ok: false, reason: 'unavailable' };

  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    const finish = (result: CapturedPassage) => {
      input.remove();
      resolve(result);
    };
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ ok: false, reason: 'canceled' });
        return;
      }
      try {
        finish({ ok: true, ...(await fileToBase64(file)) });
      } catch {
        finish({ ok: false, reason: 'empty' });
      }
    });
    input.addEventListener('cancel', () => finish({ ok: false, reason: 'canceled' }));
    input.click();
  });
}

/** Photograph a page and crop down to the sentence. */
export async function capturePassagePhoto(): Promise<CapturedPassage> {
  if (Platform.OS === 'web') return captureOnWeb();

  const ImagePicker = await loadPicker();
  if (!ImagePicker) return { ok: false, reason: 'no-camera' };

  const crop = {
    mediaTypes: ['images'] as ('images' | 'videos' | 'livePhotos')[],
    allowsEditing: true,
    quality: 0.72,
    base64: true,
    cameraType: ImagePicker.CameraType.back,
    shape: 'rectangle' as const,
  };

  const camera = await ImagePicker.requestCameraPermissionsAsync();
  let result: Awaited<ReturnType<typeof ImagePicker.launchCameraAsync>> | null = null;

  if (camera.granted) {
    try {
      result = await ImagePicker.launchCameraAsync(crop);
    } catch {
      result = null;
    }
  }

  if (!result) {
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!library.granted) return { ok: false, reason: camera.granted ? 'unavailable' : 'denied' };
    result = await ImagePicker.launchImageLibraryAsync(crop);
  }

  if (result.canceled || !result.assets?.[0]) return { ok: false, reason: 'canceled' };
  const asset = result.assets[0];
  if (!asset.base64) return { ok: false, reason: 'empty' };
  const mime = asset.mimeType?.startsWith('image/') ? asset.mimeType : 'image/jpeg';
  return { ok: true, base64: asset.base64, mime };
}

export async function transcribePassagePhoto(base64: string, mime: string): Promise<PassagePhotoResult> {
  if (!hasAi) return { ok: false, reason: 'no-desk' };
  const text = await extractPassageFromImage(base64, mime);
  if (!text) return { ok: false, reason: 'unavailable' };
  return { ok: true, text };
}
