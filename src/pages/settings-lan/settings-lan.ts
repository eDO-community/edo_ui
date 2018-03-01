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
import { AlertController, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { RosService, SystemCommand, SystemCommandType } from '../../services';
import { _ } from '../../utils';

@Component({
  selector: 'page-settings-lan',
  templateUrl: 'settings-lan.html',
})
export class SettingsLanPage {
  private loaded:boolean = false;
  private changed:boolean = false;

  private lanIP:string;
  private lanNetmask:string;

  constructor(public navCtrl: NavController, public alertCtrl: AlertController,
    private rosService: RosService, private translateService: TranslateService) {
    this.loadSettings();
  }

  ionViewCanLeave(): Promise<{}> {
    if (this.changed){
      return new Promise((resolve, reject) => {
        let confirm = this.alertCtrl.create({
          title: this.translateService.instant(_('settings-save-confirm-title')),
          message: this.translateService.instant(_('settings-save-confirm-message')),
          buttons: [{
            text: this.translateService.instant(_('settings-save-confirm-cancel')),
            handler: () => { resolve(); }
          },{
            text: this.translateService.instant(_('settings-save-confirm-save')),
            handler: async () => {
              try{
                let response:string = await this.rosService.sendSystemCommand({command:SystemCommandType.SET_LAN_IP, data:this.lanIP + " " + this.lanNetmask});
                if (response == ''){
                  resolve();
                }else{
                  let alert = this.alertCtrl.create({
                    title: this.translateService.instant(_('settings-save-error')),
                    buttons: [this.translateService.instant(_('settings-save-ok'))],
                    enableBackdropDismiss : false
                  });
                  alert.present();
                  reject();
                }
              }catch(e){
                reject();
              }
            },
          }],
          enableBackdropDismiss: false,
        });
        confirm.present();
      });
    }else{
      return Promise.resolve({});
    }
  }

  private async loadSettings(){
    let response:string = await this.rosService.sendSystemCommand({command:SystemCommandType.GET_LAN_IP, data:""});
    let parts:Array<string> = response.split(" ");

    //TODO: check expected format
    this.lanIP = parts[0];
    this.lanNetmask = parts[1];

    this.loaded = true;
  }

  private async editLanIp(){
    try{
      this.lanIP = await this.editField(this.translateService.instant('settings-edo-lan-ip'),
        this.translateService.instant('settings-edo-lan-ip-message'),
        this.lanIP);
      this.changed = true;
    } catch(error) {
    };
  }

  private async editLanNetmask(){
    try{
      this.lanNetmask = await this.editField(this.translateService.instant('settings-edo-lan-netmask'),
        this.translateService.instant('settings-edo-lan-netmask-message'),
        this.lanNetmask);
      this.changed = true;
    } catch(error) {
    };
  }

  private editField(title:string, message:string, value:string):Promise<string>{
    return new Promise<string>((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: title,
        message: message,
        inputs: [{
          type: 'text',
          name: 'input',
          value: value
        }],
        buttons: [{
          text: this.translateService.instant(_('settings-cancel')),
          handler: (data: any) => reject()
        },{
          text: this.translateService.instant(_('settings-ok')),
          handler: (data: any) => resolve(data['input'])
        }],
        enableBackdropDismiss: false
      });

      alert.present();
    });
  }
}
