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
import { NavController, NavParams, AlertController, ModalController, PopoverController, ViewController } from 'ionic-angular';
import { RosService, MovementCommand, MoveType, WaypointsService, WaypointPath, Waypoint } from '../../services';
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
  private path: WaypointPath;

  private sorting:boolean = false;

  private loopCount:number = 0;

  private loopRemaining:number = 0;

  private speed:number = 100;

  private currentElement: number = -1;

  @ViewChildren('slidingItems') private slidingItems: QueryList<any>;

  private movementTypes = {
    0: _('joint-move-on-joints'),
    1: _('joint-move-on-coords'),
    10: _('cart-move-on-joints'),
    11: _('cart-move-on-coords'),
    20: _('circ-move-on-joints'),
    21: _('circ-move-on-coords')
  }

  constructor(private navCtrl: NavController, private navParams: NavParams,
    private alertCtrl: AlertController, private translateService: TranslateService,
    private modalCtrl: ModalController, private popoverCtrl: PopoverController,
    private service: WaypointsService, private ros: RosService) {
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
    if (this.currentElement < 0){
      let confirm = this.alertCtrl.create({
        title: 'Delete waypoint?',
        message: `Do you want to delete the move with name ${item.name}`,
        buttons: [
          { text: 'Disagree' },
          {
            text: 'Agree',
            handler: () => {
              let result = this.path.removeWaypoint(id);
              this.saveCurrentWaypath();
              // TODO: show a toast indicating the success or the failure
            }
          }
        ],
        enableBackdropDismiss: false
      });
      confirm.present();
    }
  }

  private itemClone(id, item) {
    this.closeAllItems();
    if (this.currentElement < 0){
      let confirm = this.alertCtrl.create({
        title: 'Clone waypoint',
        message: `Enter the new name for ${item.name}`,
        inputs: [
          {
            name: 'name',
            placeholder: 'Name',
            value: item.name
          }
        ],
        buttons: [
          { text: 'Disagree' },
          {
            text: 'Agree',
            handler: data => {
              let result = this.path.addWaypoint(data.name, item.command.data, item.command.movement_type, item.command.movement_attributes[0], item.command.ovr, id + 1);
              this.saveCurrentWaypath();
              // TODO: show a toast indicating the success or the failure
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
      },{
        type: 'radio',
        label: this.translateService.instant(_('waypoints-detail-loop-setting-loop')),
        value: '-1',
        checked: this.loopCount == -1
      },{
        type: 'radio',
        label: '5 ' + this.translateService.instant(_('waypoints-detail-loop-setting-times')),
        value: '5',
        checked: this.loopCount == 5
      },{
        type: 'radio',
        label: '10 ' + this.translateService.instant(_('waypoints-detail-loop-setting-times')),
        value: '10',
        checked: this.loopCount == 10
      },{
        type: 'radio',
        label: '50 ' + this.translateService.instant(_('waypoints-detail-loop-setting-times')),
        value: '50',
        checked: this.loopCount == 50
      }],
      buttons: [{
        text: this.translateService.instant(_('settings-cancel')),
        handler: (data: any) => {}
      },{
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

  private async runClicked(event) {
    this.closeAllItems();
    if (this.currentElement < 0){
      await this.ros.clearQueue();

      this.path.waypoints.forEach((waypoint, index) => {
        let command:MovementCommand = <MovementCommand>Utils.cloneObject(waypoint.command);
        command.ovr = command.ovr * this.speed / 100;
        this.ros.pushMoveCommand(command, index).then(completedId => {
          if (this.currentElement == this.path.waypoints.length - 1){
            this.currentElement = -1;
            if (this.loopCount < 0){
              this.runClicked(null);
            }else if (this.loopRemaining > 0){
              this.loopRemaining--;
              this.runClicked(null);
            }else{
              this.loopRemaining = this.loopCount;
            }
          }else{
            this.currentElement = completedId + 1;
          }
        }).catch(error => {
          this.currentElement = -1;
        });
      });

      this.currentElement = 0;
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
    if (this.currentElement < 0){
      let waypointsEditor = this.modalCtrl.create(WaypointsEditorPage, {path: this.path, waypoint: waypoint}, {cssClass:'modal-waypoints-editor'});
      waypointsEditor.onDidDismiss(data => {
        if(data && data.save){
          this.saveCurrentWaypath();
        }
      });
      waypointsEditor.present();
    }
  }

  private itemCreate() {
    this.closeAllItems();
    if (this.currentElement < 0){
      let waypointsEditor = this.modalCtrl.create(WaypointsEditorPage, {path: this.path}, {cssClass:'modal-waypoints-editor'});
      waypointsEditor.onDidDismiss(data => {
        if(data && data.save){
          this.saveCurrentWaypath();
        }
      });
      waypointsEditor.present();
    }
  }

  private async waypointClicked(id, waypoint: Waypoint) {
    await this.ros.clearQueue();
    let singleMoveCommand:MovementCommand = <MovementCommand>Utils.cloneObject(waypoint.command);
    singleMoveCommand.movement_type = MoveType.MOVE_TRJNT_J;
    singleMoveCommand.ovr = this.speed;
    this.ros.pushMoveCommand(singleMoveCommand, null);
  }

  private async saveCurrentWaypath() {
    this.path = await this.service.save(this.path);
  }

  private itemReorder(event:any){
    this.path.reorder(event);

    this.saveCurrentWaypath();
  }

  private onEditName():void{
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
          text:  this.translateService.instant(_('waypoints-detail-cancel')),
          role: 'cancel'
        },
        {
          text: this.translateService.instant(_('waypoints-detail-save')),
          handler: data => {
            this.path.name = data.name;
            this.saveCurrentWaypath();
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  public toggleSort(){
    this.sorting = !this.sorting;
  }

  private canSlide(event:any, item:any){
    if (this.sorting || this.currentElement >= 0) {
      event.close();
    }
  }

  private closeAllItems(){
    this.slidingItems.forEach((item) => {item.close();});
  }
}
