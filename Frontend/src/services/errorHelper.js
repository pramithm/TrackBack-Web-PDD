export const errorHelper = {
  getFriendlyMessage: (error) => {
    // Log technical error internally for debugging and monitoring
    console.warn('[ErrorHelper] Debug Log:', error);

    if (!error) {
      return 'An unknown error occurred. Please try again.';
    }

    const message = (error.code || error.message || String(error)).toLowerCase();

    // Firebase Auth credentials / sign-in / sign-up / wrong-password cases
    if (
      message.includes('auth/invalid-credential') ||
      message.includes('auth/wrong-password') ||
      message.includes('invalid-credential') ||
      message.includes('wrong-password') ||
      message.includes('invalid credentials')
    ) {
      return 'Incorrect email or password. Please try again.';
    }

    if (
      message.includes('auth/user-not-found') || 
      message.includes('user-not-found') || 
      message.includes('user not found')
    ) {
      return 'No account was found with the provided details.';
    }

    if (
      message.includes('auth/email-already-in-use') || 
      message.includes('email-already-in-use') ||
      message.includes('email already in use')
    ) {
      return 'This email address is already registered. Please log in instead.';
    }

    if (
      message.includes('auth/weak-password') || 
      message.includes('weak-password') ||
      message.includes('weak password')
    ) {
      return 'Password is too weak. Please use at least 6 characters.';
    }

    if (
      message.includes('auth/invalid-email') || 
      message.includes('invalid-email') ||
      message.includes('invalid email')
    ) {
      return 'Please enter a valid email address.';
    }

    if (
      message.includes('auth/too-many-requests') || 
      message.includes('too-many-requests') ||
      message.includes('too many requests')
    ) {
      return 'Too many unsuccessful attempts. Please try again later.';
    }

    if (
      message.includes('auth/user-disabled') || 
      message.includes('user-disabled') ||
      message.includes('user disabled')
    ) {
      return 'This account has been disabled. Please contact support.';
    }

    // Database connection timeouts
    if (
      message.includes('timeout') ||
      message.includes('database connection timeout') ||
      message.includes('connection_timeout') ||
      message.includes('expired')
    ) {
      return 'Something went wrong. Please try again later.';
    }

    // 500 Internal Server Error
    if (
      message.includes('500') ||
      message.includes('internal server error') ||
      message.includes('internal_server_error')
    ) {
      return "We're experiencing a temporary issue. Please try again in a few moments.";
    }

    // Network / offline errors
    if (
      message.includes('network-request-failed') ||
      message.includes('network request failed') ||
      message.includes('network_error') ||
      message.includes('network connection') ||
      message.includes('offline') ||
      message.includes('no internet')
    ) {
      return 'Network connection unavailable. Please check your internet connection and try again.';
    }

    if (message.includes('permission-denied') || message.includes('permission denied')) {
      return 'Action denied. You do not have permission to access this resource.';
    }

    // Default friendly fallback message
    return 'Something went wrong. Please try again later.';
  }
};
