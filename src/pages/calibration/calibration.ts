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

import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams, MenuController } from 'ionic-angular';
import { HomePage } from '../home/home';
import { LoginPage } from '../login/login';
import { RosService, MovementCommand, MoveType } from '../../services';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'page-calibration',
  templateUrl: 'calibration.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalibrationPage {
  private firstTime:boolean = false;
  private speed: number = 30;
  private currentJoint: number = -2;
  private joints: Array<number>;
  private jointsCalibrated: Array<boolean>;

  private jointsChangeEventSubscription:Subscription;

  constructor(public navCtrl: NavController,
    private menu: MenuController,
    public navParams: NavParams,
    public ros: RosService,
    private ref: ChangeDetectorRef) {
      if (navParams.data && navParams.data.firstTime){
        this.firstTime = navParams.data.firstTime;
      }
      this.joints = new Array(6).fill(0);
      this.jointsCalibrated = new Array(6).fill(false);
      this.jointsChangeEventSubscription = this.ros.jointsChangeEvent.subscribe((_) => {
        this.ref.markForCheck();
      });
  }

  ionViewDidEnter() {
    if (this.firstTime){
      this.menu.swipeEnable(false);
    }
  }

  ionViewWillLeave() {
    if (this.firstTime){
      this.menu.swipeEnable(true);
    }
   }

  ngOnDestroy() {
    this.jointsChangeEventSubscription.unsubscribe();
  }

  private onJointsValueChange(joint, value) {
    this.joints[joint] = value * this.speed / 100;

    if (value !== 0){
      this.ros.sendJogCommand(MoveType.MOVE_TRJNT_J, this.joints);
    }
  }

  private onCalibrateStart(axis:number = -1):void{
    this.currentJoint = axis;
  }

  private onCalibrate():void{
    this.ros.sendCalibrateCommand(this.currentJoint);
    this.jointsCalibrated[this.currentJoint] = true;
    var nextToBeCalibrated:number = this.nextToBeCalibrated();
    if (nextToBeCalibrated < 0){
      this.currentJoint = -2;
      this.jointsCalibrated.fill(false);
    }else{
      this.currentJoint = nextToBeCalibrated;
    }
  }

  private nextToBeCalibrated():number{
    for (var i = 0; i < this.jointsCalibrated.length; i++) {
      if (!this.jointsCalibrated[i]){
        return i;
      }
    }
    return -1;
  }

  private onReset(event) {
    let moveComm: MovementCommand = {
      size: 6,
      data: [0, 0, 0, 0, 0, 0],
      movement_attributes: [],
      movement_type: MoveType.MOVE_TRJNT_J,
      ovr: 0
    }
    this.ros.pushMoveCommand(moveComm, null);
  }

  private onStop(event) {
    this.ros.clearQueue();
  }

  private disconnect(){
    this.navCtrl.setRoot(LoginPage);
    this.ros.disconnect();
  }
}
