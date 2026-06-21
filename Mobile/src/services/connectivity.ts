export const connectivity = {
  checkOnline: async (): Promise<boolean> => {
    try {
      const response = await Promise.race([
        fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        }),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000))
      ]);
      return response.status === 204 || response.ok;
    } catch (e) {
      console.log('[Connectivity] Offline or connection timed out:', e);
      return false;
    }
  }
};
