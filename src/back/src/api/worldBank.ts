export const fetchWorldBank = async (countryCode: string) => {
  const indicators = ['NY.GDP.PCAP.CD', 'NY.GDP.MKTP.KD.ZG', 'SL.UEM.TOTL.ZS', 'NE.EXP.GNFS.ZS', 'NE.IMP.GNFS.ZS', 'SP.DYN.LE00.IN', 'SH.DYN.MORT', 'SE.ADT.LITR.ZS', 'SP.POP.GROW', 'SP.URB.TOTL.IN.ZS', 'EN.ATM.CO2E.PC', 'EG.FEC.RNEW.ZS', 'IT.NET.USER.ZS'];
  const results = await Promise.all(
    indicators.map(i => 
      fetch(`https://api.worldbank.org/v2/country/${countryCode.toLowerCase()}/indicator/${i}?format=json&per_page=1&date=2022:2023`)
        .then(r => r.json())
        .then(d => ({ i, v: d?.[1]?.[0]?.value }))
        .catch(() => ({ i, v: null }))
    )
  );
  return results.reduce((acc, { i, v }) => (v !== null && (acc[i] = v), acc), {} as Record<string, number>);
};
