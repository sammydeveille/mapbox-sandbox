import { useEffect, useState } from 'react';

const PROFILE_KEY = 'stc_anonymous_id';

export function useProfile() {
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(PROFILE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PROFILE_KEY, id);
    }
    setProfileId(id);
  }, []);

  return { profileId };
}
