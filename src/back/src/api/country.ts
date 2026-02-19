export const fetchCountryData = async (countryCode: string) => {
  const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`).catch(() => null);
  return res ? (await res.json())[0] : null;
};
