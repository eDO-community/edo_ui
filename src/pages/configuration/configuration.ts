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
import { NavController, AlertController, MenuController } from 'ionic-angular';
import { RosService, CurrentState } from '../../services/index';
import { Subscription } from 'rxjs/Subscription';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from 'ionic-angular/components/toast/toast-controller';
import { _ } from '../../utils';
import { ConfigurationBoardPage } from '../configuration-board/configuration-board';

@Component({
  selector: 'page-configuration',
  templateUrl: 'configuration.html'
})
export class ConfigurationPage {
  private initializing: boolean = false;

  private currentStateChangeEventSubscription:Subscription;
  private machineStateTimeoutTimer:number;

  constructor(private navCtrl: NavController, private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private rosService: RosService,
    public translateService: TranslateService,
    private menu: MenuController) {
    this.currentStateChangeEventSubscription = this.rosService.machineStateChangeEvent.subscribe((status) => {
      if (status.current_state > CurrentState.INIT && this.machineStateTimeoutTimer > 0) {
        window.clearTimeout(this.machineStateTimeoutTimer);
      }
    });
  }

  ionViewDidEnter() {
    this.menu.swipeEnable(false);
  }

  ionViewWillLeave() {
    this.menu.swipeEnable(true);
  }

  ngOnDestroy() {
    if (this.machineStateTimeoutTimer > 0) {
      window.clearTimeout(this.machineStateTimeoutTimer);
    }
    this.currentStateChangeEventSubscription.unsubscribe();
  }

  initialize(axis:number) {
    let confirm = this.alertCtrl.create({
      title: this.translateService.instant(_('configuration-confirm-configuration')),
      message: this.translateService.instant(_('configuration-proceed-configuration')) + axis + this.translateService.instant(_('configuration-axis')),
      buttons: [
        {
          text: this.translateService.instant(_('settings-cancel')),
          handler: () => {
            console.log('Disagree clicked');
          }
        },
        {
          text: 'Procedi',
          handler: () => {
            this.initializing = true;
            this.machineStateTimeoutTimer = window.setTimeout(() => {
              this.initializing = false;
              this.toastCtrl.create({
                message: this.translateService.instant(_('no-machine-state-after-connect')),
                duration: 90000,
                position: 'middle'
              }).present();

              this.rosService.disconnect();
            }, 90000);
            this.rosService.sendInitCommand(axis);
          }
        }
      ],
      enableBackdropDismiss: false
    });
    confirm.present();
  }

  private disconnect() {
    this.rosService.disconnect();
  }

}
