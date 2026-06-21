export const errorHelper = {
  getFriendlyMessage: (error: any): string => {
    // Log technical error internally for debugging
    console.warn('[ErrorHelper] Internal Debug Log:', error);

    if (!error) {
      return 'An unknown error occurred. Please try again.';
    }

    const message = (error.code || error.message || String(error)).toLowerCase();

    if (
      message.includes('auth/invalid-credential') ||
      message.includes('auth/user-not-found') ||
      message.includes('auth/wrong-password') ||
      message.includes('invalid-credential') ||
      message.includes('wrong-password')
    ) {
      return 'Incorrect email or password. Please try again.';
    }

    if (message.includes('auth/email-already-in-use') || message.includes('email-already-in-use')) {
      return 'This email address is already registered. Please log in instead.';
    }

    if (message.includes('auth/weak-password') || message.includes('weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }

    if (message.includes('auth/invalid-email') || message.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }

    if (message.includes('auth/too-many-requests') || message.includes('too-many-requests')) {
      return 'Too many unsuccessful attempts. Please try again later.';
    }

    if (message.includes('auth/user-disabled') || message.includes('user-disabled')) {
      return 'This account has been disabled. Please contact support.';
    }

    if (
      message.includes('network-request-failed') ||
      message.includes('network request failed') ||
      message.includes('network_error') ||
      message.includes('network connection')
    ) {
      return 'Network connection unavailable. Please check your internet connection and try again.';
    }

    if (message.includes('permission-denied') || message.includes('permission denied')) {
      return 'Action denied. You do not have permission to access this resource.';
    }

    if (message.includes('offline') || message.includes('no internet')) {
      return 'You are offline. Please check your internet connection and try again.';
    }

    // Default friendly message if none matched
    return 'Something went wrong. Please try again later.';
  }
};
