"use strict";
const stockSW = "/sw.js";
const swReloadKey = "rift__root-sw-reload-v1";

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
 */
async function registerSW() {
     if (!navigator.serviceWorker) {
          if (
               location.protocol !== "https:" &&
               !swAllowedHostnames.includes(location.hostname)
          )
               throw new Error("Service workers cannot be registered without https.");

          throw new Error("Your browser doesn't support service workers.");
     }

     const registration = await navigator.serviceWorker.register(stockSW, {
          scope: "/",
          updateViaCache: "none",
     });

     if (navigator.serviceWorker.controller) {
          return registration;
     }

     await navigator.serviceWorker.ready;

     if (navigator.serviceWorker.controller) {
          return registration;
     }

     if (registration.active && !sessionStorage.getItem(swReloadKey)) {
          sessionStorage.setItem(swReloadKey, "1");
          location.reload();
          await new Promise(() => {});
     }

     await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Root service worker did not take control in time.")), 20000);
          navigator.serviceWorker.addEventListener(
               "controllerchange",
               () => {
                    clearTimeout(timer);
                    sessionStorage.removeItem(swReloadKey);
                    resolve();
               },
               { once: true }
          );
     });

     return registration;
}
