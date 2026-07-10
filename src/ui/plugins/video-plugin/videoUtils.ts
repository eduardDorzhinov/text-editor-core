export type VideoSourceType = "youtube" | "rutube" | "vk" | "direct";

export interface DetectedVideo {
  source: Exclude<VideoSourceType, "direct">,
  embedUrl: string,
  videoId?: string,
}

/**
 * Быстрая проверка типа существующего src (по подстрокам).
 * Используется EmbedVideoComponent для решения iframe vs <video>.
 */
export function detectVideoSource(src: string): VideoSourceType {
  if (!src) return "direct";
  if (/(?:^|\/\/)([a-z0-9-]+\.)?youtube(?:-nocookie)?\.com/i.test(src) || /youtu\.be/i.test(src)) return "youtube";
  if (/rutube\.ru/i.test(src)) return "rutube";
  if (/vk\.com\/video|vkvideo\.ru\/video/i.test(src)) return "vk";
  return "direct";
}

export function getVideoSourceLabel(type: VideoSourceType): string {
  switch (type) {
    case "youtube": return "YouTube";
    case "rutube": return "Rutube";
    case "vk": return "VK Видео";
    default: return "Видео";
  }
}

/**
 * Полная идентификация по URL: возвращает источник и готовый embed-URL
 * (то, что нужно подсунуть в <iframe src>). Null — если URL невалиден или
 * не относится к известным видеохостингам.
 */
export function detectVideoSourceFull(url: string): DetectedVideo | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

  // YouTube
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v) {
      return {
        source: "youtube",
        videoId: v,
        embedUrl: `https://www.youtube.com/embed/${v}`,
      };
    }
    const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
    if (shorts) {
      return {
        source: "youtube",
        videoId: shorts[ 1 ],
        embedUrl: `https://www.youtube.com/embed/${shorts[ 1 ]}`,
      };
    }
    const embed = u.pathname.match(/^\/embed\/([^/?#]+)/);
    if (embed) {
      return {
        source: "youtube",
        videoId: embed[ 1 ],
        embedUrl: `https://www.youtube.com/embed/${embed[ 1 ]}`,
      };
    }
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[ 0 ];
    if (id) {
      return {
        source: "youtube",
        videoId: id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
      };
    }
  }

  // Rutube
  if (host === "rutube.ru") {
    const m = u.pathname.match(/\/(?:video(?:\/private)?|play\/embed)\/([a-f0-9]+)/i);
    if (m) {
      return {
        source: "rutube",
        videoId: m[ 1 ],
        embedUrl: `https://rutube.ru/play/embed/${m[ 1 ]}`,
      };
    }
  }

  // VK
  if (host === "vk.com" || host === "vkvideo.ru") {
    if (u.pathname === "/video_ext.php") {
      const oid = u.searchParams.get("oid");
      const id = u.searchParams.get("id");
      if (oid && id) {
        // Готовый embed-URL — оставляем как есть (включая hash, hd и т.п.).
        return {
          source: "vk",
          embedUrl: trimmed,
        };
      }
    }
    const m = u.pathname.match(/\/(?:video|clip)(-?\d+)_(\d+)/);
    if (m) {
      // Для embed используем vkvideo.ru — это текущий домен VK Видео.
      // Старый vk.com/video_ext.php тоже работает, но с новым доменом
      // у VK чаще проходит embed без обязательного hash.
      return {
        source: "vk",
        embedUrl: `https://vkvideo.ru/video_ext.php?oid=${m[ 1 ]}&id=${m[ 2 ]}`,
      };
    }
  }

  return null;
}
