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
import { NavController, NavParams, ViewController } from 'ionic-angular';
import { RosService, MoveType, WaypointsService, WaypointPath, Waypoint } from '../../services';

import * as Utils from '../../utils';
import { _ } from '../../utils';

@Component({
  selector: 'page-waypoints-editor',
  templateUrl: 'waypoints-editor.html',
})
export class WaypointsEditorPage {
  private path: WaypointPath;
  private waypoint: Waypoint;

  private enableJoypad:boolean;

  private moveType: string = 'joint';
  private moveName: string = '';
  private moveTimeout: number = -1;
  private moveSpeed: number = 100;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    public viewCtrl: ViewController, public ros: RosService) {
      this.path = <WaypointPath>navParams.get('path');
      this.waypoint = <Waypoint>navParams.get('waypoint');

      if (this.waypoint != null){
        this.moveName = this.waypoint.name;
        this.moveTimeout = this.waypoint.command.movement_attributes[0];
        if (this.moveTimeout == 255){
          this.moveTimeout = -1;
        }
        this.moveSpeed = this.waypoint.command.ovr;
        this.moveType = (this.waypoint.command.movement_type == MoveType.MOVE_CARLIN_J) ? 'cartesian' : 'joint';
      }else{
        this.enableJoypad = true;
      }
  }

  get moveTimeoutStr():string {
    return this.moveTimeout.toString();
  }
  set moveTimeoutStr(value:string) {
      this.moveTimeout = parseInt(value);
  }

  private async onGotoWaypoint(event) {
    await this.ros.clearQueue();
    await this.ros.pushMoveCommand(this.waypoint.command, null);
    this.enableJoypad = true;
  }


  private async onReset(event) {
    await this.ros.clearQueue();
  }

  private addWaypointClicked(event) {
    // TODO: save also cartesian?
    if (!this.ros.isReady)
      return;

    var moveType: MoveType = MoveType.MOVE_TRJNT_J;
    if (this.moveType !== 'joint') {
      moveType = MoveType.MOVE_CARLIN_J;
    }
    let timeout = this.moveTimeout;
    if (timeout == -1){
      timeout = 255;
    }
    if (this.waypoint == null){
      this.path.addWaypoint(this.moveName, Utils.cloneArray(this.ros.jointsTarget), moveType, timeout);
    }else{
      this.path.updateWaypoint(this.waypoint, this.moveName, Utils.cloneArray(this.ros.jointsTarget), moveType, timeout)
    }
    this.viewCtrl.dismiss({save:true});
  }

  private close(){
    this.viewCtrl.dismiss({save:false});
  }
}
