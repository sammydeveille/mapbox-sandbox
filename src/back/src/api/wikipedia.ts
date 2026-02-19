export const fetchWikipedia = async (lat: number, lng: number) => {
  const data = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=10000&gslimit=5&format=json&origin=*`).then(r => r.json());
  return data.query?.geosearch?.map((a: any) => ({
    title: a.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(a.title.replace(/ /g, '_'))}`,
    distance: a.dist
  })) || [];
};
