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

import { Injectable } from "@angular/core";
import { Storage } from '@ionic/storage';
import { SettingsKeys } from '../utils';
import * as Utils from '../utils';
import { MovementCommand, MoveType } from "../services";

/**
 * Waypoint representing a robot position
 */
export type Waypoint = {
  name?: string,
  command: MovementCommand
};

/**
 * A path representing a list of Waypoint
 */
export class WaypointPath {
  id?: string;
  name: string
  waypoints: Array<Waypoint>;

  constructor(name: string = '', waypoints: Array<Waypoint> = []) {
    this.name = name;
    this.waypoints = waypoints
  }

  /**
   * Deep clone WaypointPath
   */
  static from(waypointPath: WaypointPath) {
    let path = new WaypointPath();
    path.id = waypointPath.id;
    path.name = waypointPath.name;
    path.waypoints = Utils.cloneArray(waypointPath.waypoints);
    return path;
  }

  /**
   * Add a new Waypoint to the current path at specified index position or at the end.
   */
  addWaypoint(name: string = '', data: number[], movement_type: MoveType = MoveType.MOVE_TRJNT_J, timeout = 255, speed = 100, index: number = -1) {
    let waypoint: Waypoint = { name:'', command: null };

    this.updateWaypoint(waypoint, name, data, movement_type, timeout, speed)

    if (index < 0) {
      this.waypoints.push(waypoint)
    } else {
      this.waypoints.splice(index, 0, waypoint);
    }
  }

  /**
   * Update a Waypoint in the current path.
   */
  updateWaypoint(waypoint:Waypoint, name: string = '', data: number[], movement_type: MoveType = MoveType.MOVE_TRJNT_J, timeout = 255, speed = 100) {
    let command: MovementCommand = {
      data: data,
      size: data.length,
      movement_type: movement_type,
      movement_attributes: [timeout],
      ovr: speed
    };
    waypoint.name = name;
    waypoint.command = command;
  }

  /**
   * Remove a Waypoint in the current path.
   */
  removeWaypoint(index: number): boolean {
    if (index >= 0 && index < this.waypoints.length) {
      this.waypoints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Sort Waypoints in the current path.
   */
  reorder(event:any){
    const element = this.waypoints[event.from];
    this.waypoints.splice(event.from, 1);
    this.waypoints.splice(event.to, 0, element);
  }
};

/**
 * Service to load and save WaypointPath from underlying storage
 */
@Injectable()
export class WaypointsService {
  constructor(public storage: Storage) {

  }

  /**
   * Load (async) all WaypointPath saved in the underlying storage
   */
  async load(): Promise<WaypointPath[]> {
    await this.storage.ready();

    let waypointsIds: Array<string> = await this.storage.get(SettingsKeys.WAYPOINTS) || [];
    let waypointsPromises: Promise<WaypointPath>[] = waypointsIds.map(wp => this.storage.get(wp));

    let waypoints = [];
    for (var i in waypointsPromises){
      waypoints[i] = await waypointsPromises[i];
    }

    return waypoints.map(waypointPath => WaypointPath.from(waypointPath));
  }

  /**
   * Save (async) a WaypointPath to the underlying storage
   */
  async save(waypointPath: WaypointPath): Promise<WaypointPath> {
    if (typeof waypointPath.id === 'undefined') {
      waypointPath.id = Utils.uuidGenerator();
    }
    let waypointsIds = await this.storage.get(SettingsKeys.WAYPOINTS)

    // If first waypointPath saved, create waypointsIds array
    if (waypointsIds === null)
      waypointsIds = [];

    // If saving a new point, add it to waypointsIds array
    if (waypointsIds.indexOf(waypointPath.id) < 0) {
      waypointsIds.unshift(waypointPath.id);
      await this.storage.set(SettingsKeys.WAYPOINTS, waypointsIds);
    }

    await this.storage.set(waypointPath.id, waypointPath);
    return waypointPath;
  }

  /**
   * Delete (async) a WaypointPath from the underlying storage
   */
  async delete(waypoints: WaypointPath):Promise<any> {
    if (typeof waypoints.id === 'undefined') {
      return;
    }

    let waypointsIds = await this.storage.get(SettingsKeys.WAYPOINTS);
    waypointsIds.splice(waypointsIds.indexOf(waypoints.id), 1);
    await this.storage.set(SettingsKeys.WAYPOINTS, waypointsIds);

    await this.storage.remove(waypoints.id);
  }

  /**
   * Sort WaypointPath
   */
  async reorder(from:any, to:any):Promise<any> {
    let ids = await this.storage.get(SettingsKeys.WAYPOINTS);

    const element = ids[from];
    ids.splice(from, 1);
    ids.splice(to, 0, element);

    return await this.storage.set(SettingsKeys.WAYPOINTS, ids);
  }
}
