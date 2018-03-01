/**
 * @license
 * Copyright (c) 2018, COMAU S.p.A.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * The views and conclusions contained in the software and documentation are those
 * of the authors and should not be interpreted as representing official policies,
 * either expressed or implied, of the FreeBSD Project.
 */

import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { IonicStorageModule } from '@ionic/storage';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpModule, Http } from '@angular/http';

import { EDOModule } from './edo.module';
import { EDOApp } from './app.component';
import { AboutPage } from '../pages/about/about';
import { LoginPage } from '../pages/login/login';
import { HomePage } from '../pages/home/home';
import { ConfigurationPage } from '../pages/configuration/configuration';
import { ConfigurationBoardPage } from '../pages/configuration-board/configuration-board';
import { CalibrationPage } from '../pages/calibration/calibration';
import { WaypointsListPage } from '../pages/waypoints-list/waypoints-list';
import { WaypointsDetailPage } from '../pages/waypoints-detail/waypoints-detail';
import { WaypointsEditorPage } from '../pages/waypoints-editor/waypoints-editor';
import { SettingsPage } from '../pages/settings/settings';
import { SettingsLanPage } from '../pages/settings-lan/settings-lan';
import { SettingsWiFiPage } from '../pages/settings-wi-fi/settings-wi-fi';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Globalization } from '@ionic-native/globalization';

import { EDOUnlockModalComponent } from '../components/edo-unlock-modal/edo-unlock-modal';
import { PluginService } from '../services';
import { SettingsPluginsPage } from '../pages/settings-plugins/settings-plugins';

export function createTranslateLoader(http: Http) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    EDOApp,
    EDOUnlockModalComponent,
    AboutPage,
    LoginPage,
    HomePage,
    ConfigurationPage,
    ConfigurationBoardPage,
    CalibrationPage,
    WaypointsListPage,
    WaypointsDetailPage,
    WaypointsEditorPage,
    SettingsPage,
    SettingsLanPage,
    SettingsWiFiPage,
    SettingsPluginsPage
  ],
  imports: [
    BrowserModule,
    HttpModule,
    IonicModule.forRoot(EDOApp),
    IonicStorageModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [Http]
      }
    }),
    EDOModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    EDOApp,
    EDOUnlockModalComponent,
    AboutPage,
    LoginPage,
    HomePage,
    ConfigurationPage,
    ConfigurationBoardPage,
    CalibrationPage,
    WaypointsListPage,
    WaypointsDetailPage,
    WaypointsEditorPage,
    SettingsPage,
    SettingsLanPage,
    SettingsWiFiPage,
    SettingsPluginsPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    PluginService,
    Globalization
  ]
})
export class AppModule { }
