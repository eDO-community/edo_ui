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
import { NavController, PopoverController, MenuController } from 'ionic-angular';
import { RosService } from '../../services/index';
import { Subscription } from 'rxjs/Subscription';
import { ConfigurationBoardGuideComponent } from '../../components/configuration-board-guide/configuration-board-guide';

@Component({
  selector: 'page-configuration-board',
  templateUrl: 'configuration-board.html'
})
export class ConfigurationBoardPage {
  private setJointIdStatuSubscription: Subscription;

  private status: number = 0;
  private lastMessage: string;
  private currentJoint: number = 0;
  private configurationBoardGuide;

  constructor(private navCtrl: NavController,
    private popoverCtrl: PopoverController,
    private rosService: RosService,
    private menu: MenuController) {
    this.setJointIdStatuSubscription = this.rosService.setJointIdStatusEvent.subscribe((event) => {
      this.status = event.command;
      if (event.command == 1) {
        this.lastMessage = event.data;
      } else if (event.command == 2) {
        this.showConfigurationBoardGuide(1 + this.currentJoint);
        this.currentJoint++;
      } else if (event.command == 0 && this.currentJoint == 0) {
        this.showConfigurationBoardGuide(1);
        this.currentJoint++;
      }
      console.log("Data: " + event.data + " Command: " + event.command);
    })
    this.showConfigurationBoardGuide(0);
  }

  ionViewDidEnter() {
    this.menu.swipeEnable(false);
  }

  ionViewWillLeave() {
    this.menu.swipeEnable(true);
  }

  private showConfigurationBoardGuide(sliderId: number) {
    if (this.configurationBoardGuide != null) {
      this.configurationBoardGuide.dismiss();
      this.configurationBoardGuide = null;
    }

    this.configurationBoardGuide = this.popoverCtrl.create(ConfigurationBoardGuideComponent, {
      dismiss: () => {
        if (this.configurationBoardGuide != null) {
          this.configurationBoardGuide.dismiss();
          this.configurationBoardGuide = null;
        }
      }, sliderId: sliderId
    }, { showBackdrop: true, enableBackdropDismiss: false, cssClass: 'configuration-board-guide' });
    this.configurationBoardGuide.present();
  }

  ngOnDestroy() {
    this.setJointIdStatuSubscription.unsubscribe();
  }

  next() {
    this.rosService.sendSetJointId(this.currentJoint);
    this.status = 1;
  }

  restart() {
    this.currentJoint = 0;
    this.status = -1;
    this.lastMessage = "";
  }

  private disconnect() {
    this.rosService.disconnect();
  }
}
