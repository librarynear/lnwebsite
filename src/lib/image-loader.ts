export default function imageKitLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (src.startsWith("https://ik.imagekit.io")) {
    const params = [`w-${width}`];
    if (quality) {
      params.push(`q-${quality}`);
    } else {
      params.push("q-75"); // default quality
    }
    const paramsString = params.join(",");
    
    // Check if the URL already has query parameters
    let url = src;
    
    try {
      const parsedUrl = new URL(src);
      const existingTr = parsedUrl.searchParams.get('tr');
      
      if (existingTr) {
        const parts = existingTr.split(',');
        const newParts = parts.filter(p => !p.startsWith('w-') && !p.startsWith('q-') && !p.startsWith('h-'));
        
        const wPart = parts.find(p => p.startsWith('w-'));
        const hPart = parts.find(p => p.startsWith('h-'));
        
        if (wPart && hPart && wPart.substring(2) === hPart.substring(2)) {
          newParts.push(`w-${width}`, `h-${width}`);
        } else {
          newParts.push(`w-${width}`);
        }
        
        newParts.push(`q-${quality || 75}`);
        parsedUrl.searchParams.set('tr', newParts.join(','));
        url = parsedUrl.toString();
      } else {
        parsedUrl.searchParams.set('tr', paramsString);
        url = parsedUrl.toString();
      }
    } catch (e) {
      // Ignore
    }

    return url;
  }
  
  if (src.startsWith("https://lh3.googleusercontent.com")) {
    // Google profile images can be resized by appending =s{width}
    return `${src.split('=')[0]}=s${width}`;
  }

  return src;
}
