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

import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import * as Utils from '../../utils';
import { RosService, MovementCommand, MoveType } from "../../services";
import { Subscription } from 'rxjs/Subscription';

export enum JoystickMode{
  CARTESIAN=0,
  JOINTS=1,
  INPUT_CARTESIAN=2,
  INPUT_JOINTS=3,
}

@Component({
  selector: 'joystick',
  templateUrl: 'joystick.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoystickComponent {
  private JoystickMode = JoystickMode;

  private inputCartesian: any;
  private inputJoints: Array<string>;
  private inputActiveIndex: number = 0;
  private inputActiveKey: string = 'x';

  private cartesian: Array<number>;
  private joints: Array<number>;
  // private gripper: number;
  private speed: number = 100;

  private mode: JoystickMode = JoystickMode.JOINTS;

  /**
   Click map for robot schema
   */
  private mapPoints = [
    [445, 641, 444, 721, 447, 758, 497, 766, 542, 759, 547, 698, 548, 660, 577, 645, 587, 618, 592, 591, 520, 587, 454, 584],
    [400, 575, 602, 608, 618, 548, 617, 516, 599, 498, 587, 489, 598, 464, 588, 444, 568, 432, 543, 423, 518, 416, 482, 428, 419, 480, 393, 515],
    [504, 412, 601, 468, 641, 447, 692, 398, 707, 351, 690, 317, 650, 312, 616, 308, 602, 309, 569, 315, 515, 315, 489, 322, 511, 395],
    [462, 247, 495, 316, 562, 324, 594, 295, 608, 271, 586, 247, 577, 219, 561, 204, 521, 197, 471, 224],
    [356, 192, 361, 218, 398, 217, 458, 221, 457, 241, 565, 193, 558, 137, 538, 93, 519, 85, 412, 126, 353, 163],
    [341, 247, 362, 300, 399, 318, 431, 298, 448, 267, 468, 229, 470, 190, 428, 166, 388, 179]
  ]

  /**
   Selected joint in joint joystick
   */
  private currentJoint: number = 0;
  /**
   Selected rotational axis in cartesian joystick
   */
  private currentAxis: number = 3;

  private jointsChangeEventSubscription:Subscription;

  constructor(private ros: RosService, private ref: ChangeDetectorRef) {
    this.cartesian = new Array(6).fill(0);
    this.joints = new Array(6).fill(0);
    this.inputCartesian = {x:"0",y:"0",z:"0",a:"0",e:"0",r:"0"};
    this.inputJoints = new Array(6).fill("0");
    this.jointsChangeEventSubscription = this.ros.jointsChangeEvent.subscribe((_) => {
      this.ref.markForCheck();
    });
  }


  ngOnDestroy() {
    this.jointsChangeEventSubscription.unsubscribe();
  }

  private onCartesianValueChange(axis, value) {
    this.cartesian[axis] = value * this.speed / 100;

    if (value !== 0){
      this.ros.sendJogCommand(MoveType.MOVE_TRJNT_C, this.cartesian);
    }
  }

  private onJointsValueChange(joint, value) {
    this.joints[joint] = value * this.speed / 100;

    if (value !== 0){
      this.ros.sendJogCommand(MoveType.MOVE_TRJNT_J, this.joints);
    }
  }

  private onInputGo(event) {
    if (this.mode == JoystickMode.INPUT_JOINTS){
      let joints = this.inputJoints.map((v:string)=> parseFloat(v));
      let moveComm: MovementCommand = {
        size: 6,
        data: joints,
        movement_attributes: [],
        movement_type: MoveType.MOVE_TRJNT_J,
        ovr: this.speed
      }
      this.ros.pushMoveCommand(moveComm, null).catch(x => {});
    }else if (this.mode == JoystickMode.INPUT_CARTESIAN){
      let cartesian = [parseFloat(this.inputCartesian.x),
        parseFloat(this.inputCartesian.y),
        parseFloat(this.inputCartesian.z),
        parseFloat(this.inputCartesian.a),
        parseFloat(this.inputCartesian.e),
        parseFloat(this.inputCartesian.r)]
      let moveComm: MovementCommand = {
        size: 6,
        data: cartesian,
        movement_attributes: this.ros.convertFlagsToMovementAttribute(0, this.inputCartesian.config_flags),
        movement_type: MoveType.MOVE_TRJNT_C,
        ovr: this.speed
      }
      this.ros.pushMoveCommand(moveComm, null).catch(x => {});
    }
  }

  private onReset(event) {
    let moveComm: MovementCommand = {
      size: 6,
      data: [0, 0, 0, 0, 0, 0],
      movement_attributes: [],
      movement_type: MoveType.MOVE_TRJNT_J,
      ovr: this.speed
    }
    this.ros.pushMoveCommand(moveComm, null);
  }

  private onStop(event) {
    this.ros.clearQueue();
  }

  /**
   * Click on joint selector in joint joystick
   * See: https://forum.ionicframework.com/t/solved-ionic2-class-gesture-direction-values-swipe/63116/2
   * @param {Event} event
   */
  private onMapSwipe(event) {
    switch (event.direction) {
      case 2: // INPUT_MOVE = 2;
        this.currentJoint = Utils.mod(this.currentJoint + 1, this.joints.length);
        break;
      case 4:
        this.currentJoint = Utils.mod(this.currentJoint - 1, this.joints.length);
        break;
    }
  }

  /**
   * Click on rotational axis selector in cartesian joystick
   * @param {Event} event
   * @param {number} axis index of the axis clicked
   */
  private onAxisClick(event, axis) {
    this.currentAxis = axis;
  }

  private onSwitchInput(mode:JoystickMode){
    this.mode = mode;
    this.inputCartesian = Object.keys(this.ros.cartesianPosition).reduce((result, key) => {
      if (typeof this.ros.cartesianPosition[key] === 'number'){
        result[key] = this.ros.cartesianPosition[key].toFixed(2);
      }else{
        result[key] = this.ros.cartesianPosition[key];
      }
      return result;
    }, {});
    this.inputJoints = this.ros.joints.map((v:number)=>v.toFixed(2));
  }

  private onKeypadInputChange(value:string){
    if (this.mode == JoystickMode.INPUT_JOINTS){
      this.inputJoints[this.inputActiveIndex] = value;
    }else{
      this.inputCartesian[this.inputActiveKey] = value;
    }
  }
}
