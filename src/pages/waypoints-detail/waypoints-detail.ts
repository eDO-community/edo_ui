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

import { Component, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { JoystickComponent } from '../../components/joystick/joystick';
import { NavController, NavParams, AlertController, ModalController, PopoverController, ViewController, ToastController } from 'ionic-angular';
import { RosService, MovementCommand, MoveType, WaypointsService, WaypointPath, Waypoint, Point } from '../../services';
import { WaypointsEditorPage } from '../waypoints-editor/waypoints-editor';
import { TranslateService } from '@ngx-translate/core';

import * as Utils from '../../utils';
import { _ } from '../../utils';

@Component({
  selector: 'page-waypoints-detail',
  templateUrl: 'waypoints-detail.html',
  providers: [WaypointsService]
})
export class WaypointsDetailPage {
  private map: any;

  private path: WaypointPath;

  private sorting: boolean = false;

  private loopCount: number = 0;

  private loopRemaining: number = 0;

  private speed: number = 100;

  private currentElement: number = -1;

  @ViewChildren('slidingItems') private slidingItems: QueryList<any>;


  constructor(private navCtrl: NavController, private navParams: NavParams,
    private alertCtrl: AlertController, private translateService: TranslateService,
    private modalCtrl: ModalController, private popoverCtrl: PopoverController,
    private service: WaypointsService, private ros: RosService,
    public toastCtrl: ToastController) {

    this.map = {
      74: {
        74: 'joint-move-on-joints',
        80: 'joint-move-on-coords',
        88: 'joint-move-on-coords'
      },
      76: {
        74: 'cart-move-on-joints',
        80: 'cart-move-on-coords',
        88: 'cart-move-on-coords'
      },
      67: {
        74: 'circ-move-on-joints',
        80: 'circ-move-on-coords',
        88: 'circ-move-on-coords'
      }
    };

    this.path = <WaypointPath>navParams.get('path');

    if (typeof this.path === 'undefined') {
      this.path = new WaypointPath();
    }
    if (typeof this.path.id === 'undefined') {
      this.saveCurrentWaypath();
    }
  }

  ionViewWillLeave() {
    this.ros.clearQueue();
  }

  private itemDelete(id, item) {
    this.closeAllItems();
    if (this.currentElement < 0) {
      let confirm = this.alertCtrl.create({
        title: this.translateService.instant('waypoints-detail-delete-title'),
        message: this.translateService.instant('waypoints-detail-delete-description') + ` ${item.name}`,
        buttons: [
          { text: this.translateService.instant('waypoints-detail-disagree') },
          {
            text: this.translateService.instant('waypoints-detail-agree'),
            handler: () => {
              let result = this.path.removeWaypoint(id);
              this.saveCurrentWaypath(true);
            }
          }
        ],
        enableBackdropDismiss: false
      });
      confirm.present();
    }
  }

  private itemClone(id: number, item: Waypoint) {
    this.closeAllItems();
    if (this.currentElement < 0) {
      let confirm = this.alertCtrl.create({
        title: this.translateService.instant('waypoints-detail-clone-title'),
        message: this.translateService.instant('waypoints-detail-clone-description') + ` ${item.name}`,
        inputs: [
          {
            name: 'name',
            placeholder: this.translateService.instant("waypoints-detail-name"),
            value: item.name
          }
        ],
        buttons: [
          { text: this.translateService.instant('waypoints-detail-disagree') },
          {
            text: this.translateService.instant('waypoints-detail-agree'),
            handler: data => {
              var target: Point = item.command.target
              let result = this.path.addWaypoint(target, <any>item.command.tool, data.name, item.command.move_type, item.command.delay, item.command.ovr, id + 1);
              this.saveCurrentWaypath(true);
            }
          }
        ],
        enableBackdropDismiss: false
      });
      confirm.present();
    }
  }

  private loopClicked() {
    this.closeAllItems();

    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('waypoints-detail-loop-setting-title')),
      message: this.translateService.instant(_('waypoints-detail-loop-setting-message')),
      inputs: [{
        type: 'radio',
        label: this.translateService.instant(_('waypoints-detail-loop-setting-no-loop')),
        value: '0',
        checked: this.loopCount == 0
      }, {
        type: 'radio',
        label: this.translateService.instant(_('waypoints-detail-loop-setting-loop')),
        value: '-1',
        checked: this.loopCount == -1
      }, {
        type: 'radio',
        label: '5 ' + this.translateService.instant(_('waypoints-detail-loop-setting-times')),
        value: '5',
        checked: this.loopCount == 5
      }, {
        type: 'radio',
        label: '10 ' + this.translateService.instant(_('waypoints-detail-loop-setting-times')),
        value: '10',
        checked: this.loopCount == 10
      }, {
        type: 'radio',
        label: '50 ' + this.translateService.instant(_('waypoints-detail-loop-setting-times')),
        value: '50',
        checked: this.loopCount == 50
      }],
      buttons: [{
        text: this.translateService.instant(_('settings-cancel')),
        handler: (data: any) => { }
      }, {
        text: this.translateService.instant(_('settings-ok')),
        handler: (data: any) => {
          this.loopCount = parseInt(data);
          this.loopRemaining = this.loopCount;
        }
      }],
      enableBackdropDismiss: false
    });

    alert.present();
  }

  private async runClicked(event, isLoop: boolean) {
    this.closeAllItems();
    if (this.currentElement < 0 || isLoop) {
      if (!isLoop){
        await this.ros.clearQueue();
        this.currentElement = 0;
      }

      this.path.waypoints.forEach((waypoint, index) => {
        let command: MovementCommand = <MovementCommand>Utils.cloneObject(waypoint.command);
        command.ovr = command.ovr * this.speed / 100;
        this.ros.pushMoveCommand(command, index).then(completedId => {
          if (this.currentElement == this.path.waypoints.length - 1) {
            if (this.loopCount < 0) {
              this.runClicked(null, true);
            } else if (this.loopRemaining > 0) {
              this.loopRemaining--;
              this.runClicked(null, true);
            } else {
              this.loopRemaining = this.loopCount;
            }
          }

          if (this.currentElement == this.path.waypoints.length - 1) {
            if (this.loopRemaining != 0){
              this.currentElement = 0;
            }else{
              this.currentElement = -1;
            }
          } else {
            this.currentElement = completedId + 1;
          }
        }).catch(error => {
          this.currentElement = -1;
        });
      });
    }
  }

  private stopClicked(event) {
    this.closeAllItems();
    this.currentElement = -1;
    this.loopRemaining = this.loopCount;
    this.ros.clearQueue();
  }

  private itemSelected(i, waypoint) {
    this.closeAllItems();
    if (this.currentElement < 0) {
      let waypointsEditor = this.modalCtrl.create(WaypointsEditorPage, { path: this.path, waypoint: waypoint }, { cssClass: 'modal-waypoints-editor' });
      waypointsEditor.onDidDismiss(data => {
        if (data && data.save) {
          this.saveCurrentWaypath(true);
        }
      });
      waypointsEditor.present();
    }
  }

  private itemCreate() {
    this.closeAllItems();
    if (this.currentElement < 0) {
      let waypointsEditor = this.modalCtrl.create(WaypointsEditorPage, { path: this.path }, { cssClass: 'modal-waypoints-editor' });
      waypointsEditor.onDidDismiss(data => {
        if (data && data.save) {
          this.saveCurrentWaypath(true);
        }
      });
      waypointsEditor.present();
    }
  }

  private async waypointClicked(id, waypoint: Waypoint) {
    await this.ros.clearQueue();
    let singleMoveCommand: MovementCommand = <MovementCommand>Utils.cloneObject(waypoint.command);
    singleMoveCommand.move_type = MoveType.JOINT;
    singleMoveCommand.ovr = this.speed;
    this.ros.pushMoveCommand(singleMoveCommand, null);
  }

  private async saveCurrentWaypath(createToast?: boolean) {
    try {
      this.path = await this.service.save(this.path);
      if(createToast)
        this.toastCtrl.create({
          message: this.translateService.instant(('waypoints-detail-action-complete')),
          duration: 3000,
          position: 'bottom'
        }).present();
    } catch (e) {
      this.toastCtrl.create({
        message: this.translateService.instant(('waypoints-detail-action-error')),
        duration: 3000,
        position: 'bottom'
      }).present();
    }
  }

  private itemReorder(event: any) {
    this.path.reorder(event);

    this.saveCurrentWaypath();
  }

  private onEditName(): void {
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('waypoints-detail-edit-name-title')),
      inputs: [
        {
          name: 'name',
          placeholder: this.translateService.instant(_('waypoints-detail-edit-name')),
          value: this.path.name
        }
      ],
      buttons: [
        {
          text: this.translateService.instant(_('waypoints-detail-cancel')),
          role: 'cancel'
        },
        {
          text: this.translateService.instant(_('waypoints-detail-save')),
          handler: data => {
            this.path.name = data.name;
            this.saveCurrentWaypath(true);
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  public toggleSort() {
    this.sorting = !this.sorting;
  }

  private canSlide(event: any, item: any) {
    if (this.sorting || this.currentElement >= 0) {
      event.close();
    }
  }

  private closeAllItems() {
    this.slidingItems.forEach((item) => { item.close(); });
  }
}
