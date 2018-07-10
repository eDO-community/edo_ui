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

import { Component, ViewChild } from '@angular/core';
import { AlertController, Nav, Platform, Toast, ToastController, Popover, PopoverController, ViewController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Globalization } from '@ionic-native/globalization';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';

import { EDOUnlockModalComponent } from '../components/edo-unlock-modal/edo-unlock-modal';
import { AboutPage } from '../pages/about/about';
import { HomePage } from '../pages/home/home';
import { ConfigurationPage } from '../pages/configuration/configuration';
import { ConfigurationBoardPage } from '../pages/configuration-board/configuration-board';
import { LoginPage } from '../pages/login/login';
import { CalibrationPage } from '../pages/calibration/calibration';
import { WaypointsListPage } from '../pages/waypoints-list/waypoints-list';
import { SettingsPage } from '../pages/settings/settings';

import { RosService, CurrentState, PluginService } from '../services';
import { _, SettingsKeys, DEFAULT_LANGUAGE, DEFAULT_IP, DEFAULT_PORT, getPreferredLanguage } from '../utils';

@Component({
  templateUrl: 'app.html'
})
export class EDOApp {
  @ViewChild(Nav) nav: Nav;

  private rootPage: any = LoginPage;

  private pages: Array<{ title: string, component: any, icon: string }>;
  private connectionToast: Toast = null;
  private unlockEDOPopover: Popover = null;

  private currentCalibrationState : CurrentState = CurrentState.DISCONNECTED;

  constructor(public platform: Platform, public statusBar: StatusBar,
    public splashScreen: SplashScreen, public storage: Storage,
    public rosService: RosService, public translateService: TranslateService,
    public globalization: Globalization, private toastCtrl: ToastController,
    public alertCtrl:AlertController, public popoverCtrl: PopoverController,
    private pluginService: PluginService) {
    this.initializeApp();

    // used for an example of ngFor and navigation
    this.pages = [
      { title: _('home-title'), component: HomePage, icon: 'home' },
      { title: _('waypoints-title'), component: WaypointsListPage, icon: 'list' },
      { title: _('calibration-title'), component: CalibrationPage, icon: 'locate' },
      { title: _('settings-title'), component: SettingsPage, icon: 'settings' },
      { title: _('about-title'), component: AboutPage, icon: 'information-circle' }
    ];

    this.rosService.machineStateChangeEvent.subscribe(state => {
      if (state.current_state == CurrentState.DISCONNECTED && this.connectionToast === null && this.currentCalibrationState > CurrentState.INIT) {
        this.connectionToast = this.toastCtrl.create({
          message: translateService.instant(_('server-not-connected')),
          position: 'bottom',
          showCloseButton: true,
          closeButtonText: translateService.instant(_('retry'))
        });

        this.connectionToast.onWillDismiss(data => {
          this.connectionToast = null;
          if (data !== null && data.hasOwnProperty('forced') && data.forced)
            return;
          this.rosService.connect();
        });

        this.connectionToast.present();
      } else if (state.current_state > CurrentState.DISCONNECTED){
        if (this.connectionToast !== null) {
          this.connectionToast.dismiss({ forced: true });
        }
      }
      if (state.current_state < CurrentState.INIT) {
        if (this.currentCalibrationState != CurrentState.DISCONNECTED){
          this.currentCalibrationState = CurrentState.DISCONNECTED;
          this.nav.setRoot(LoginPage);
        }
      }else if (state.current_state == CurrentState.INIT && (state.opcode & 2) == 2) {
        if (this.currentCalibrationState != CurrentState.INIT_DISCOVER){
          this.currentCalibrationState = CurrentState.INIT_DISCOVER;
          this.nav.setRoot(ConfigurationBoardPage);
        }
      }else if (state.current_state == CurrentState.INIT && (state.opcode & 2) != 2) {
        if (this.currentCalibrationState != CurrentState.INIT){
          this.currentCalibrationState = CurrentState.INIT;
          this.nav.setRoot(ConfigurationPage);
        }
      }else if (state.current_state == CurrentState.NOT_CALIBRATED) {
        if (this.currentCalibrationState != CurrentState.NOT_CALIBRATED){
          this.currentCalibrationState = CurrentState.NOT_CALIBRATED;
          this.nav.setRoot(CalibrationPage, {firstTime:true})
        }
      }else if (state.current_state == CurrentState.CALIBRATED){
        if (this.currentCalibrationState != CurrentState.CALIBRATED){
          this.currentCalibrationState = CurrentState.CALIBRATED;
          this.nav.setRoot(HomePage);
        }
      }else if (state.current_state == CurrentState.MACHINE_ERROR){
        let alert = this.alertCtrl.create({
          title: this.translateService.instant(_('machine-error')),
          message: this.translateService.instant(_('machine-error-message')),
          buttons: [{
            text: this.translateService.instant(_('settings-ok')),
            handler: (data: any) => {this.disconnect();}
          }],
          enableBackdropDismiss: false
        });
        alert.present();
      }
      if (state.current_state == CurrentState.BREAKED){
        if (this.unlockEDOPopover == null){
          this.unlockEDOPopover = this.popoverCtrl.create(EDOUnlockModalComponent, {disconnect: ()=>this.disconnect()}, {showBackdrop:true, enableBackdropDismiss:false, cssClass:'edo-unlock-modal'});
          this.unlockEDOPopover.present();
        }
      }else{
        if (this.unlockEDOPopover != null){
          this.unlockEDOPopover.dismiss();
          this.unlockEDOPopover = null;
        }
      }
    })
  }

  private async initializeApp() {
    await this.platform.ready();

    this.platform.pause.subscribe(() => {
      this.rosService.clearQueue();
    });

    // Okay, so the platform is ready and our plugins are available.
    // Here you can do any higher level native things you might need.
    this.statusBar.styleDefault();
    this.splashScreen.hide();
    this.translateService.setDefaultLang(DEFAULT_LANGUAGE);

    let initialized = await this.storage.get(SettingsKeys.INITIALIZED);

    if (initialized == null || initialized == false) {
      // init default values for settings
      await this.storage.set(SettingsKeys.WS_SERVICE_URL, DEFAULT_IP);
      await this.storage.set(SettingsKeys.WS_SERVICE_PORT, DEFAULT_PORT);
      await this.storage.set(SettingsKeys.LANGUAGE, '');
      await this.storage.set(SettingsKeys.INITIALIZED, true);
    }

    let language = await this.storage.get(SettingsKeys.LANGUAGE);
    if (!language) {
      language = await getPreferredLanguage(this.globalization, this.translateService);
    }
    this.translateService.use(language);

    this.nav.viewWillEnter.subscribe((view) => {
      if (view.instance.constructor == this.rootPage){
        this.currentCalibrationState = CurrentState.DISCONNECTED;
        if (this.connectionToast){
          this.connectionToast.dismiss({ forced: true });
          this.connectionToast = null;
        }
      }
    });

    var pluginMenuItems:any = await this.pluginService.loadPlugins();

    pluginMenuItems.sort((a, b)=>{
      var keyA = this.translateService.instant(a.title),
          keyB = this.translateService.instant(b.title);
      // Compare the 2 dates
      if(keyA < keyB) return -1;
      if(keyA > keyB) return 1;
      return 0;
  });

    for (var plugin in pluginMenuItems){
      this.pages.push({ title: pluginMenuItems[plugin].title, component: pluginMenuItems[plugin].componentType, icon: pluginMenuItems[plugin].icon })
    }
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }

  async disconnect(){
    if (this.rosService.joints != null){
      let alert = this.alertCtrl.create({
        title: this.translateService.instant(_('logout-title')),
        buttons: [],
        enableBackdropDismiss: false
      });

      alert.addButton({
        text: this.translateService.instant(_('logout-confirm')),
        handler: () => {
          this.nav.setRoot(this.rootPage);
          this.rosService.disconnect();
        }
      });
      if (!this.isCalibrationPosition() && this.rosService.machineState.current_state != CurrentState.BREAKED){
        alert.setMessage(this.translateService.instant(_('logout-message-not-in-calibration')));
        alert.addButton({
          text: this.translateService.instant(_('logout-goto-joystick')),
          handler: () => {
            this.nav.setRoot(HomePage);
          }
        });
      }else{
        alert.setMessage(this.translateService.instant(_('logout-message')));
      }
      alert.addButton({
        text: this.translateService.instant(_('logout-dismiss')),
      });
      alert.present();
    }else{
      this.nav.setRoot(this.rootPage);
      this.rosService.disconnect();
    }
  }

  isCalibrationPosition():boolean{
    for (var i:number = 0; i < this.rosService.joints.joints.length; i++){
      if (Math.abs(this.rosService.joints.joints[i].position) > 0.5){
        return false;
      }
    }
    return true;
  }
}

