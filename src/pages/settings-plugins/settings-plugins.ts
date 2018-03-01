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
import { PluginService, Plugin } from '../../services';
import { _ } from '../../utils';
import { SplashScreen } from '@ionic-native/splash-screen';

@Component({
  selector: 'page-settings-plugins',
  templateUrl: 'settings-plugins.html',
})
export class SettingsPluginsPage {
  private loaded:boolean = false;
  private changed:boolean = false;
  private plugins:Plugin[];

  constructor(public navCtrl: NavController, public alertCtrl: AlertController,
    public splashScreen: SplashScreen,
    private pluginsService: PluginService,
    private translateService: TranslateService) {
    this.loadSettings();
  }

  ionViewCanLeave(): Promise<{}> {
    if (this.changed){
      return new Promise((resolve, reject) => {
        let confirm = this.alertCtrl.create({
          title: this.translateService.instant(_('settings-plugin-reload-title')),
          message: this.translateService.instant(_('settings-plugin-reload-message')),
          buttons: [{
            text: this.translateService.instant(_('settings-plugin-reload-after')),
            handler: () => { resolve(); }
          },{
            text: this.translateService.instant(_('settings-plugin-reload-now')),
            handler: () => {
              reject();
              this.splashScreen.show();
              window.location.reload(true);
            },
          }],
          enableBackdropDismiss : false
        });
        confirm.present();
      });
    }else{
      return Promise.resolve({});
    }
  }

  private async loadSettings(){
    this.plugins = await this.pluginsService.getPlugins();

    this.loaded = true;
  }

  private async toggleEnabled(plugin:Plugin){
    this.changed = true;
    if (plugin.enabled){
      this.pluginsService.disablePlugin(plugin.id);
      plugin.enabled = false;
    }else{
      this.pluginsService.enablePlugin(plugin.id);
      plugin.enabled = true;
    }
  }
}
