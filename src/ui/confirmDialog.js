const requests = [];
let notifyHost = null;

export function confirmAction(message) {
  return new Promise((resolve) => {
    requests.push({ kind: "confirm", message: String(message || "Are you sure?"), resolve });
    notifyHost?.();
  });
}

export function notifyAction(message, title = "Notice") {
  return new Promise((resolve) => {
    requests.push({ kind: "notice", title, message: String(message || "Please check your details."), resolve });
    notifyHost?.();
  });
}

export function showNotice(message) {
  const text = String(message || "");
  const title = /error|could not|failed|denied|unavailable/i.test(text) ? "Something went wrong"
    : /successfully|saved|uploaded|submitted|restored|deleted/i.test(text) ? "Done"
      : "Please check";
  void notifyAction(text, title);
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
