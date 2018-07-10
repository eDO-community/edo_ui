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
import { NavController, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Globalization } from '@ionic-native/globalization';
import { TranslateService } from '@ngx-translate/core';
import { SettingsLanPage } from '../settings-lan/settings-lan';
import { SettingsWiFiPage } from '../settings-wi-fi/settings-wi-fi';
import { SettingsPluginsPage } from '../settings-plugins/settings-plugins';
import { _, SettingsKeys, AVAILABLE_LANGUAGES, getPreferredLanguage } from '../../utils';
import { RosService } from '../../services/index';
import { SettingsToolsListPage } from '../settings-tools-list/settings-tools-list';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  private language:string = '';
  private flagBaseUrl:string = 'assets/img/flags/';

  constructor(private navCtrl: NavController, private alertCtrl: AlertController,
    private translateService: TranslateService, private storage: Storage,
    private globalization: Globalization,
    private rosService:RosService) {
      this.loadSettings();
  }

  private async loadSettings(){
    this.language = await this.storage.get(SettingsKeys.LANGUAGE);
  }

  private gotoLan():void{
    this.navCtrl.push(SettingsLanPage);
  }

  private gotoWiFi():void{
    this.navCtrl.push(SettingsWiFiPage);
  }

  private gotoPlugins():void{
    this.navCtrl.push(SettingsPluginsPage);
  }

  private gotoTools(){
    this.navCtrl.push(SettingsToolsListPage)
  }

  private get languageStr():object{
    if (this.language){
      var data:{name:string, code:string} = {code:'', name:'Unknown'};
      AVAILABLE_LANGUAGES.forEach(x => {
        if (x.code == this.language){
          data = x;
        }
      })
      return {name: data.name, url: `${this.flagBaseUrl}${data.code}.svg`};
    }else{
      return {name: this.translateService.instant(_('settings-edo-language-auto')), url: `${this.flagBaseUrl}auto.svg`};
    }
  }

  private async editLanguage(){
    try{
      this.language = await this.editLanguageAlert(this.translateService.instant(_('settings-edo-language')),
        this.translateService.instant(_('settings-edo-language-message')),
        this.language);
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

  private async editControlSwitch(){
    try{
      let value:boolean = await this.editControlSwitchAlert(this.translateService.instant(_('settings-edo-control-switch')),
        this.translateService.instant(_('settings-edo-control-switch-message')));
      this.rosService.sendControlSwitch(value);
    } catch(error) {
    };
  }

  private editControlSwitchAlert(title:string, message:string):Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: title,
        message: message,
        inputs: [{
          type: 'radio',
          label: this.translateService.instant(_('settings-edo-control-switch-disable')),
          value: '0',
          checked: true
        },{
          type: 'radio',
          label: this.translateService.instant(_('settings-edo-control-switch-enable')),
          value: '1',
          checked: false
        }],
        buttons: [{
          text: this.translateService.instant(_('settings-cancel')),
          handler: (data: any) => reject()
        },{
          text: this.translateService.instant(_('settings-ok')),
          handler: (data: any) => resolve(data == '1' ? true : false)
        }],
        enableBackdropDismiss: false
      });

      alert.present();
    });
  }
}
