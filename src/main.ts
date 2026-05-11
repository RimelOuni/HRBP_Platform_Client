/*import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
*/
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// ✅ FIX NG02100 — Enregistrement du locale français AVANT le bootstrap
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
registerLocaleData(localeFr, 'fr', localeFrExtra);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));