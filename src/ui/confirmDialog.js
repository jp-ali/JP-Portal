const requests = [];
let notifyHost = null;

export function confirmAction(message) {
  return new Promise((resolve) => {
    requests.push({ kind: "confirm", message: String(message || "Are you sure?"), resolve });
    notifyHost?.();
  });
}

export function notifyAction(message) {
  return new Promise((resolve) => {
    requests.push({ kind: "notice", message: String(message || "Please check your details."), resolve });
    notifyHost?.();
  });
}

export function takeConfirmRequest() {
  return requests.shift() || null;
}

export function subscribeConfirmHost(notify) {
  notifyHost = notify;
  notify();
  return () => {
    if (notifyHost === notify) notifyHost = null;
  };
}
