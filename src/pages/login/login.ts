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

import { Component } from '@angular/core';
import { NavController, NavParams, ToastController, AlertController, MenuController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import { HomePage } from '../home/home';
import { CalibrationPage } from '../calibration/calibration';
import { RosService, CurrentState } from '../../services';
import { SettingsKeys, DEFAULT_IP, DEFAULT_PORT, AVAILABLE_LANGUAGES, getPreferredLanguage, _ } from '../../utils';
import { Subscription } from 'rxjs/Subscription';
import { TranslateService } from '@ngx-translate/core';
import { Globalization } from '@ionic-native/globalization';
import { ConfigurationPage } from '../configuration/configuration';
import { AppVersion } from '@ionic-native/app-version';

declare var cordova: any | undefined;

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private language:string = '';

  private ready:boolean;
  private connecting:boolean;
  private failed:boolean;

  private ip:string;

  private currentStateChangeEventSubscription:Subscription;
  private machineStateTimeoutTimer:number;

  private appVersion:string;

  constructor(private navCtrl: NavController, private navParams: NavParams,
    private statusBar: StatusBar, private toastCtrl:ToastController,
    private storage: Storage, private rosService: RosService,
    public translateService: TranslateService, private alertCtrl: AlertController,
    private globalization: Globalization,
    private app: AppVersion,
    private menu: MenuController) {
    this.currentStateChangeEventSubscription = this.rosService.machineStateChangeEvent.subscribe((status) => {
      if (status.current_state >= CurrentState.INIT && this.machineStateTimeoutTimer > 0){
        window.clearTimeout(this.machineStateTimeoutTimer);
      }

      if (status.current_state == CurrentState.DISCONNECTED) {
        this.connecting = false;
        this.failed = true;
      }else if (status.current_state == CurrentState.UNKNOWN) {
        this.machineStateTimeoutTimer = window.setTimeout(()=>{
          this.failed = true;
          this.toastCtrl.create({
            message: translateService.instant(_('no-machine-state-after-connect')),
            duration: 5000,
            position: 'middle'
          }).present();
          this.rosService.disconnect();
        }, 5000);
      }else{
        this.connecting = false;
      }
    });
    this.storage.get(SettingsKeys.WS_SERVICE_URL).then(url => {
      if (url != DEFAULT_IP){
        this.ip = url;
      }
      this.ready = true;
    });

    this.app.getVersionNumber().then(version => {
      this.appVersion = version;
    }).catch(error => {
      this.appVersion = "N/A";
    });
  }

  ionViewDidEnter() {
      this.menu.swipeEnable(false);
  }

  ionViewWillLeave() {
      this.menu.swipeEnable(true);
   }


  ngOnDestroy() {
    if (this.machineStateTimeoutTimer > 0){
      window.clearTimeout(this.machineStateTimeoutTimer);
    }
    this.currentStateChangeEventSubscription.unsubscribe();
  }

  async connect() {
    let url: string = await this.storage.get(SettingsKeys.WS_SERVICE_URL);
    let port: string = await this.storage.get(SettingsKeys.WS_SERVICE_PORT);

    this.connecting = true;
    this.failed = false;

    this.rosService.connectTo(url, port);
  }

  async connectToDefault() {
    await this.storage.set(SettingsKeys.WS_SERVICE_URL, DEFAULT_IP);
    await this.storage.set(SettingsKeys.WS_SERVICE_PORT, DEFAULT_PORT);
    this.connect();
  }

  async connectToIP() {
    if (typeof cordova !== 'undefined'){
      cordova.plugins.Keyboard.close();
    }
    await this.storage.set(SettingsKeys.WS_SERVICE_URL, this.ip);
    await this.storage.set(SettingsKeys.WS_SERVICE_PORT, DEFAULT_PORT);
    this.connect();
  }

  private async editLanguage(){
    try{
      this.language = await this.editLanguageAlert(this.translateService.instant(_('settings-edo-language')),
        this.translateService.instant(_('settings-edo-language-message')),
        await this.storage.get(SettingsKeys.LANGUAGE));
      await this.storage.set(SettingsKeys.LANGUAGE, this.language);
      if (this.language){
        this.translateService.use(this.language);
      }else{
        this.translateService.use(await getPreferredLanguage(this.globalization, this.translateService));
      }
    } catch(error) {
    };
  }

  private editLanguageAlert(title:string, message:string, value:string):Promise<string>{
    return new Promise<string>((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: title,
        message: message,
        inputs: [{
          type: 'radio',
          label: 'Auto',
          value: '',
          checked: (value ? false : true)
        }],
        buttons: [{
          text: this.translateService.instant(_('settings-cancel')),
          handler: (data: any) => reject()
        },{
          text: this.translateService.instant(_('settings-ok')),
          handler: (data: any) => resolve(data)
        }],
        enableBackdropDismiss: false
      });

      AVAILABLE_LANGUAGES.forEach(language => {
        alert.addInput({
          type: 'radio',
          label: language.name,
          value: language.code,
          checked: (language.code == value)
        })
      })

      alert.present();
    });
  }
}
