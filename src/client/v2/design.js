/* Independent V2 preview, reset to the current V1 baseline on 20 October 2026.
   Keep the shared renderers and behaviour. Future experiments belong here and
   in design.css, scoped to data-preview="v2" (never data-design="v2").
   Build-time storage namespacing and the /v2/ PWA scope remain independent. */
document.documentElement.dataset.preview = 'v2';
