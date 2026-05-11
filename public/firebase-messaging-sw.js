importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBbf9xNTgXefZCu3hx959L8ABPJdiXvzqI",
  authDomain: "studio-8790021152-8f79e.firebaseapp.com",
  projectId: "studio-8790021152-8f79e",
  storageBucket: "studio-8790021152-8f79e.appspot.com",
  messagingSenderId: "375368194061",
  appId: "1:375368194061:web:f5effd42a02a8e64125d44"
});

const messaging = firebase.messaging();

// Handle FCM push messages when app is backgrounded or closed
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Last Year';
  const body = payload.notification?.body || 'Something new happened.';
  self.registration.showNotification(title, {
    body,
    icon: '/lastyear.png',
    badge: '/lastyear.png',
    data: { url: payload.data?.url || '/' },
    vibrate: [100, 50, 100],
  });
});

// Focus or open app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
