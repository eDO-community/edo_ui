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

import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

//FIXME: temporary to show errors
import { ToastController } from 'ionic-angular';

import * as Utils from './../utils';

import * as Ros from 'roslib';
import { ServiceResponse } from 'roslib';
import { ToolsService, Tool } from './tools.service';

export enum CurrentState {
  DISCONNECTED = -2,
  UNKNOWN = -1,
  INIT = 0,
  NOT_CALIBRATED = 1,
  CALIBRATED = 2,
  MOVE = 3,
  JOG = 4,
  MACHINE_ERROR = 5,
  BREAKED = 6,
  INIT_DISCOVER = 254, /* UI internal state if we are initializing joints  */
  COMMAND = 255 /* state machine busy keep previous state */
}

export type CartesianPose = {
  x:number,
  y:number,
  z:number,
  a:number,
  e:number,
  r:number,
  config_flags:string
};
export type Point = {
  data_type: DestinationType,
  cartesian_data:CartesianPose,
  joints_mask: number,
  joints_data: number[]
}
export type Frame = {
  x:number,
  y:number,
  z:number,
  a:number,
  e:number,
  r:number,
}
export type MachineState = {
  current_state: CurrentState;
  opcode: number;
};
export type MovementCommand = {
  move_command: MoveCommand,
  move_type: MoveType,
  ovr: number,
  delay: number,
  cartesian_linear_speed: number,
  target: Point,
  via: Point,
  tool: Frame | string,
  frame: Frame,
  remote_tool: number
};
export type JointCalibration = {
  joints_mask: number
};
export type JointControl = {
  position:number,
  velocity:number,
  current:number,
  ff_velocity:number,
  ff_current:number
}
export type JointControlArray = {
  size: number,
  joints: JointControl[]
}
export type JointInit = {
  mode: number,
  joints_mask: number,
  reduction_factor: number
};
export type JointReset = {
  joints_mask: number,
  disengage_steps: number,
  disengage_offset: number
}
export type JointState = {
  position: number,
  velocity: number,
  current: number,
  commandFlag: number
}
export type JointStateArray = {
  joints_mask: number,
  joints: JointState[]
}
export type SystemCommand = {
  command: SystemCommandType,
  data: string
};
export type MovementFeedback = {
  type: MessageFeedback,
  data: any
};
export type NodeSwVersion = {
  id:number;
  version: string
};
export type NodeSwVersionArray = {
  nodes: NodeSwVersion[]
};

/**
 * Movement type supported
 */
export enum MoveType {
  JOINT = 74, //'J'
  LINEAR = 76, //'L',
  CIRCULAR = 67, //'C'
};

export enum MoveCommand {
  EXE_JOGMOVE = 74, // 'J'
  EXE_MOVE = 77, // 'M'
  PAUSE = 80, // 'P' Pause movement execution
  RESUME = 82, // 'R' Resume movement execution
  CANCEL_MOVE = 67, // 'C' Cancel movement execution and empty robot queue
};

export enum DestinationType {
  JOINT = 74, //'J'
  POSITION = 80, //'P'
  XTNDPOS = 88, //'X'
};

/**
 * System commands & responses type
 */
export enum SystemCommandType{
  // Get / set e.DO time as milliseconds since epoch
  SET_TIME=0,
  SET_TIME_RESPONSE=0,

  // Get / set e.DO lan IP, format: "10.42.0.49 255.255.255.0"
  SET_LAN_IP=1,
  SET_LAN_IP_RESPONSE=1,
  GET_LAN_IP=2,
  GET_LAN_IP_RESPONSE=2,

  // Get / set e.DO WiFi SSID and password, format: "<base64> <base64>"
  SET_WIFI_SSID=3,
  SET_WIFI_SSID_RESPONSE=3,
  GET_WIFI_SSID=4,
  GET_WIFI_SSID_RESPONSE=4
}

/**
 * System command queue item
 */
class SystemCommandQueueItem {
  // e.DO command data
  message: SystemCommand;
  // promise resolution function
  resolve: Function = null;
  // promise reject function
  reject: Function = null;

  constructor(message: SystemCommand) {
    this.message = <SystemCommand>Utils.cloneObject(message);
  }
};

/**
 * Message feedback codes for move commands
 */
export enum MessageFeedback {
  COMMAND_RECEIVED = 0,
  SEND_NEXT_IF_AVAILABLE = 1,
  COMMAND_EXECUTED = 2,
  ERROR = -1
};

/**
 * Movement command queue item
 */
class MovementCommandQueueItem {
  // e.DO command data
  message: MovementCommand;
  // current command status
  status: MessageFeedback = null;
  // promise resolution function
  resolve: Function = null;
  // promise reject function
  reject: Function = null;
  // additional data returned by promise resulution
  data: any;

  constructor(message: MovementCommand, data:any) {
    this.message = <MovementCommand>Utils.cloneObject(message);
    this.data = data;
  }
};

export const ERROR_MESSAGES:any = {
  "-1":"The service is not supported.",
  "-2":"The specified RobotNumber is out of range.",
  "-3":"Unknown TargetID.",
  "-4":"Unknown EventID.",
  "-5":"The specified parameter is not found.",
  "-6":"The specified tool is not found.",
  "-7":"The specified object is not found.",
  "-8":"The specified event number is not found.",
  "-9":"The specified message number is not found.",
  "-10":"The specified joint is not found. No such joint.",
  "-11":"No more parameters. End of file.",
  "-12":"The specified input format is not supported.",
  "-13":"The specified output format is not supported.",
  "-14":"The specified storage is not supported.",
  "-15":"The specified accuracy type is not supported.",
  "-16":"The specified event type is not supported.",
  "-17":"The specified motion type is not supported.",
  "-18":"The specified target type is not supported.",
  "-19":"The specified orientation interpolation mode is not supported.",
  "-20":"The specified dominant interpolation space is not supported.",
  "-21":"The specified parameter can not be modified (no write access).",
  "-22":"Wrong number of parameters for ORL service.",
  "-23":"The format of the input data is wrong.",
  "-24":"The format of the configuration string is wrong.",
  "-25":"The motion is not possible in the specified time.",
  "-26":"The specified parameter value is out of range.",
  "-27":"The specified time is out of range.",
  "-28":"The specified distance is out of range.",
  "-29":"The specified encoder value is out of range.",
  "-30":"The specified speed value is out of range.",
  "-31":"The specified acceleration value is out of range.",
  "-32":"The specified correction type is out of range.",
  "-33":"String is too long.",
  "-34":"Error in matrix. Incomplete matrix.",
  "-35":"Cartesian position expected.",
  "-36":"Joint position expected.",
  "-37":"No robot between object and tool.",
  "-38":"Too many events defined.",
  "-39":"The specified condition is not valid.",
  "-40":"There are no events.",
  "-41":"There are no messages.",
  "-42":"No target set.",
  "-43":"Initial position not set.",
  "-44":"Tracking is not set.",
  "-45":"Too many conveyors set.",
  "-46":"Not able to create/update file.",
  "-47":"Illegal use of service. Can't do that.",
  "-48":"Memory problem.",
  "-49":"Internal software error.",
  "-50":"Other error.",
  "-51":"No solution is found. One joint is out of range.",
  "-52":"Cartesian position is out of work range.",
  "-53":"Too many controllers.",
  "-54":"STOP_MOTION is unsuccessful. No motion in progress.",
  "-55":"The service is not performed. Motion in progress.",
  "-56":"Initialization is not performed. Machine data file is not found.",
  "-57":"The specified frame is not found.",
  "-58":"Service cannot initialize another instance of a robot.",
  "-59":"The specified position is singular.",
  "-60":"The specified accelerationn type is not supported.",
  "-61":"No more frames. End of file.",
  "-62":"The specified frame can not be modified (no write access).",
  "-63":"Unsupported rotation axis.",
  "-64":"Machine data file not found.",
  "-65":"Initialization not performed because of not accepted version number.",
  "-66":"Reset level not supported.",
  "-67":"The output-block is too short.",
  "-68":"Fatal error. Stopped calculating (for GET_NEXT_STEP only).",
  "-69":"The parameter ManipulatorType is not supported.",
  "-70":"The specified ManipulatorType is not valid.",
  "-71":"Position not stored, target buffer is full.",
  "-72":"The list of services to debug is full.",
  "-73":"The FirstNext mechanism is not supported.",
  "-74":"Position overspecified.",
  "-75":"Position underspecified.",
  "-76":"Can't move, incomplete or inconsistent motion specification.",
  "-77":"Input block too short.",
  "-78":"Not ready to receive targets.",
  "-79":"The specified position is not acceptable.",
  "-80":"The specified conveyor is not found.",
  "-81":"Service not applicable for this robot type.",
  "-82":"The specified group is not found.",
  "-83":"The specified jerk value is out of range.",
  "-84":"The specified jerk type is out of range.",
  "-85":"RobotPathName is write protected.",
  "-86":"The current working directory is write protected.",
  "-87":"The specified EventID is already in use.",
  "-88":"The specified time compensation is not supported.",
  "-89":"The same controller has been already initialized.",
  "-90":"The controller can't be destroyed.",
  "-91":"The controller doesn't exist.",
  "-92":"Powerlink Communication not active.",
  "-93":"Request Joints Mask not available.",
  "-94":"Missing information about some joints.",
  "-95":"The function is not available in the current Open Modality .",
  "-96":"Requested Values are invalid.",
  "-97":"ORL not initialized.",
  "-98":"ItDM not available.",
  "-99":"Unknown Error.",
  "-100":"Unknown Error.",
  "-101":"tipo movimento non riconosciuto",
  "-102":"Motion non pronto",
  "-103":"Movimento non eseguito",
  "-104":"Errore Generico",
}

/**
 * Service handling commands queuing and comunication with e.DO using ROSLibJS.
 */
@Injectable()
export class RosService {
  public readonly machineStateChangeEvent = new Subject<MachineState>();

  public running: boolean = false;
  public paused: boolean = false;

  public machineState:MachineState = {current_state: CurrentState.DISCONNECTED, opcode: 0};

  public joints: JointStateArray = {joints_mask:0, joints:[]};
  public readonly jointsChangeEvent = new Subject<JointStateArray>();
  public jointsLastUpdate: Date;
  public jointsTarget: JointControlArray = {size:0, joints:[]};
  public cartesianPosition:CartesianPose = {x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''};
  public readonly cartesianPositionChangeEvent = new Subject<any>();
  public cartesianPositionLastUpdate: Date;
  public readonly setJointIdStatusEvent = new Subject<SystemCommand>();

  public get isReady(): boolean {
    return this.machineState.current_state == CurrentState.CALIBRATED ||
          this.machineState.current_state == CurrentState.JOG ||
          this.machineState.current_state == CurrentState.MOVE;
  }

  private ros: Ros.Ros = null;

  private serviceSwVersion: Ros.Service;
  private serviceSystemCommand: Ros.Service;

  // Read Topic
  private topicJntState: Ros.Topic;
  private topicJntTargetState: Ros.Topic;
  private topicCartesianPose: Ros.Topic;
  private topicMoveAck: Ros.Topic;
  private topicMachineState: Ros.Topic;
  private topicSetJointIdStatus: Ros.Topic;

  // Write Topic
  private topicMoveCommand: Ros.Topic;
  private topicJogCommand: Ros.Topic;
  private topicJointCalibrationCommand: Ros.Topic;
  private topicJointInitCommand: Ros.Topic;
  private topicJointResetCommand: Ros.Topic;
  private topicSetJointId: Ros.Topic;
  private topicControlSwitch: Ros.Topic;

  private lastRosUrl: string;
  private lastRosPort: string;

  private pendingQueue: Array<MovementCommandQueueItem> = [];
  private waitingReceiveQueue: Array<MovementCommandQueueItem> = [];
  private waitingExecutedQueue: Array<MovementCommandQueueItem> = [];

  private connectTimeoutTimer:number;

  //FIXME: temporary to show errors
  constructor(private toastCtrl: ToastController, private toolsService:ToolsService) {

  }

  connectTo(url: string, port:string): void {
    this.lastRosUrl = url;
    this.lastRosPort = port;
    this.connect();
  }

  connect(): void {
    if (this.machineState.current_state > CurrentState.DISCONNECTED || this.ros !== null) {
      this.disconnect();
    }
    try{
      this.ros = new Ros.Ros({
        url: `ws://${this.lastRosUrl}:${this.lastRosPort}`
      });

      this.ros.on('connection', () => {
        console.log('Connected to websocket server.');
        window.clearTimeout(this.connectTimeoutTimer);
        this.machineState.current_state = CurrentState.UNKNOWN;
        this.machineStateChangeEvent.next(this.machineState);
        //window.setTimeout(()=>{
        //  this.sendSystemCommand({command : SystemCommandType.SET_TIME, data: String(new Date().getTime())})
        //}, 500);
      });

      this.ros.on('error', (error) => {
        console.log('Error connecting to websocket server: ', error);
        this.disconnect();
      });

      this.ros.on('close', () => {
        console.log('Connection to websocket server closed.');
        this.disconnect();
      });

      this.initCommands();

      this.connectTimeoutTimer = window.setTimeout(()=>{
        this.machineState.current_state = CurrentState.UNKNOWN; // force a connectedChangeEvent
        this.machineState.opcode = 0;
        this.disconnect();
      }, 2500);
    }catch(e){
      this.machineState.current_state = CurrentState.UNKNOWN; // force a connectedChangeEvent
      this.machineState.opcode = 0;
      this.disconnect();
    }
  }

  disconnect(): void {
    this.pendingQueue.splice(0, this.pendingQueue.length);
    this.waitingReceiveQueue.splice(0, this.waitingReceiveQueue.length);
    this.waitingExecutedQueue.splice(0, this.waitingExecutedQueue.length);
    this.running = false;
    this.paused = false;
    this.joints = {joints_mask:0, joints:[]};
    this.jointsLastUpdate = null;
    this.jointsTarget = {size:0, joints:[]};
    this.cartesianPosition = {x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''};
    this.cartesianPositionLastUpdate = null;
    if (this.machineState.current_state != CurrentState.DISCONNECTED || this.machineState.opcode != 0){
      this.machineState.current_state = CurrentState.DISCONNECTED;
      this.machineState.opcode = 0;
      this.machineStateChangeEvent.next(this.machineState);
    }

    if (this.ros) {
      this.ros.close();
      this.ros = null;
    }
    if (this.topicJntState) {
      this.topicJntState.unsubscribe();
      this.topicJntState = null;
    }
    if (this.topicJntTargetState){
      this.topicJntTargetState.unsubscribe();
      this.topicJntTargetState = null;
    }
    if (this.topicCartesianPose) {
      this.topicCartesianPose.unsubscribe();
      this.topicCartesianPose = null;
    }
    if (this.topicMoveAck) {
      this.topicMoveAck.unsubscribe();
      this.topicMoveAck = null;
    }
    if (this.topicMachineState) {
      this.topicMachineState.unsubscribe();
      this.topicMachineState = null;
    }
    if (this.topicSetJointIdStatus) {
      this.topicSetJointIdStatus.unsubscribe();
      this.topicSetJointIdStatus = null;
    }
  }

  private initCommands(): void {
    this.serviceSwVersion = new Ros.Service({
      ros: this.ros,
      name: '/machine_bridge_sw_version_srv',
      serviceType: 'edo_core_msgs/NodeSwVersionArray'
    });

    this.serviceSystemCommand = new Ros.Service({
      ros: this.ros,
      name: '/system_command_srv',
      serviceType: 'edo_core_msgs/SystemCommand'
    });

    this.topicControlSwitch = new Ros.Topic({
      ros: this.ros,
      name: '/bridge_c5g',
      messageType: 'std_msgs/bool'
    });

    this.topicMachineState = new Ros.Topic({
      ros: this.ros,
      name: '/machine_state',
      messageType: 'edo_core_msgs/MachineState',
      throttle_rate: 200 // 0.1 seconds
    });
    this.topicMachineState.subscribe(message => {
      let newState:MachineState = <MachineState>message;
      if ((this.machineState.current_state != newState.current_state ||
        this.machineState.opcode != newState.opcode) && newState.current_state < CurrentState.COMMAND){
        this.machineState = newState;
        this.machineStateChangeEvent.next(this.machineState);
      }
    });

    this.topicJntState = new Ros.Topic({
      ros: this.ros,
      name: '/usb_jnt_state',
      messageType: 'edo_core_msgs/JointStateArray',
      throttle_rate: 200 // 0.1 seconds
    });
    this.topicJntState.subscribe(message => {
      this.joints = <JointStateArray>message
      this.jointsLastUpdate = new Date();
      this.jointsChangeEvent.next(this.joints);
    });

    this.topicJntTargetState = new Ros.Topic({
      ros: this.ros,
      name: '/algo_jnt_ctrl',
      messageType: 'edo_core_msgs/JointControlArray',
      throttle_rate: 200 // 0.1 seconds
    });
    this.topicJntTargetState.subscribe(message => {
      this.jointsTarget = {size:0 /*FIXME */, joints:message['joints'].map(joint => joint.position)} ;
    });

    this.topicCartesianPose = new Ros.Topic({
      ros: this.ros,
      name: '/cartesian_pose',
      messageType: 'edo_core_msgs/CartesianPose',
      throttle_rate: 200 // 0.1 seconds
    });
    this.topicCartesianPose.subscribe(message => {
      this.cartesianPosition = <CartesianPose>message;
      this.cartesianPositionLastUpdate = new Date();
      this.cartesianPositionChangeEvent.next(this.cartesianPosition);
    });

    this.topicMoveCommand = new Ros.Topic({
      ros: this.ros,
      name: '/bridge_move',
      messageType: 'edo_core_msgs/MovementCommand'
    });

    this.topicJogCommand = new Ros.Topic({
      ros: this.ros,
      name: '/bridge_jog',
      messageType: 'edo_core_msgs/MovementCommand'
    });

    this.topicJointCalibrationCommand = new Ros.Topic({
      ros: this.ros,
      name: '/bridge_jnt_calib',
      messageType: 'edo_core_msgs/JointCalibration'
    });

    this.topicJointInitCommand = new Ros.Topic({
      ros: this.ros,
      name: '/bridge_init',
      messageType: 'edo_core_msgs/JointInit'
    });

    this.topicJointResetCommand = new Ros.Topic({
      ros: this.ros,
      name: '/bridge_jnt_reset',
      messageType: 'edo_core_msgs/JointReset'
    });

    this.topicSetJointId = new Ros.Topic({
      ros: this.ros,
      name: '/set_joint_id',
      messageType: 'std_msgs/UInt8'
    });
    this.topicSetJointIdStatus = new Ros.Topic({
      ros: this.ros,
      name: '/status_set_joint_id',
      messageType: 'edo_core_msgs/SystemCommand'
    });
    this.topicSetJointIdStatus.subscribe(message => {
      this.setJointIdStatusEvent.next(<SystemCommand>message);
    });
    this.topicMoveAck = new Ros.Topic({
      ros: this.ros,
      name: '/machine_movement_ack',
      messageType: 'edo_core_msgs/MovementFeedback'
    });
    this.topicMoveAck.subscribe(message => {
        switch ((<MovementFeedback>message).type) {
          case MessageFeedback.COMMAND_RECEIVED:
            let waitingReceiveQueue : MovementCommandQueueItem = this.waitingReceiveQueue.shift();
            if (waitingReceiveQueue !== undefined){
              waitingReceiveQueue.status = MessageFeedback.COMMAND_RECEIVED;
              //Allow to work on the simulator this should never happen on a real e.DO
              if ((this.machineState.opcode & 65536) &&  this.pendingQueue.length > 0 && this.waitingExecutedQueue.length == 0) {
                let pendingQueueItem : MovementCommandQueueItem = this.pendingQueue.shift();
                if (pendingQueueItem !== undefined){
                  this.waitingReceiveQueue.push(pendingQueueItem);
                  this.waitingExecutedQueue.push(pendingQueueItem);
                  this.sendMoveCommand(pendingQueueItem.message);
                }
              }
            }else{
              console.log("Unexpected ack 0");
            }
            break;
          case MessageFeedback.SEND_NEXT_IF_AVAILABLE:
            let pendingQueueItem : MovementCommandQueueItem = this.pendingQueue.shift();
            if (pendingQueueItem !== undefined){
              this.waitingReceiveQueue.push(pendingQueueItem);
              this.waitingExecutedQueue.push(pendingQueueItem);
              this.sendMoveCommand(pendingQueueItem.message);
            }
            break;
          case MessageFeedback.COMMAND_EXECUTED:
            let waitingExecutedQueueItem : MovementCommandQueueItem = this.waitingExecutedQueue.shift();
            if (waitingExecutedQueueItem !== undefined){
              waitingExecutedQueueItem.status = MessageFeedback.COMMAND_EXECUTED;
              waitingExecutedQueueItem.resolve(waitingExecutedQueueItem.data);


              if (this.pendingQueue.length > 0 && this.waitingExecutedQueue.length == 0) {
                let pendingQueueItem : MovementCommandQueueItem = this.pendingQueue.shift();
                if (pendingQueueItem !== undefined){
                  this.waitingReceiveQueue.push(pendingQueueItem);
                  this.waitingExecutedQueue.push(pendingQueueItem);
                  this.sendMoveCommand(pendingQueueItem.message);
                }
              }else if (waitingExecutedQueueItem.message.move_command !== MoveCommand.PAUSE) {
                if (this.waitingExecutedQueue.length == 0){// Ensure this is last real move and not an ack to a resume
                  this.running = false;
                }
              }
            }
            break;
          case MessageFeedback.ERROR:
            waitingExecutedQueueItem = this.waitingExecutedQueue.shift();
            while (waitingExecutedQueueItem !== undefined){
              waitingExecutedQueueItem.status = MessageFeedback.COMMAND_EXECUTED;
              waitingExecutedQueueItem.reject(waitingExecutedQueueItem.data);
              waitingExecutedQueueItem = this.waitingExecutedQueue.shift();
            }
            this.waitingReceiveQueue.splice(0, this.pendingQueue.length);

            this.clearQueue();


            var detail:string = ERROR_MESSAGES[(<MovementFeedback>message).data];
            this.toastCtrl.create({
              message: 'Error executing command. Error Code:' + (<MovementFeedback>message).data + "\nDetail: " + detail,
              duration: 10000,
              position: 'middle'
            }).present();
        }
      });
  }

  get pendingQueueLength():number {
    return this.pendingQueue.length;
  }
  get waitingReceiveQueueLength():number {
    return this.waitingReceiveQueue.length;
  }
  get waitingExecutedQueueLength():number {
    return this.waitingExecutedQueue.length;
  }

  async sendCalibrateCommand(joint:number) {
    await this.clearQueue();

    if (this.machineState.current_state == CurrentState.DISCONNECTED) return;

    if (joint == null){
      let command: JointCalibration = {
        joints_mask: this.joints.joints_mask
      }
      this.topicJointCalibrationCommand.publish(command);
    }else{
      let command: JointCalibration = {
        joints_mask: 1 << joint
      }
      this.topicJointCalibrationCommand.publish(command);
    }
  }

  async sendResetCommand(){
    if (this.machineState.current_state == CurrentState.DISCONNECTED) return;
    let command: JointReset = {
      joints_mask: this.joints.joints_mask,
      disengage_steps: 2000,
      disengage_offset: 3.5
    }
    this.topicJointResetCommand.publish(command);
  }

  async sendInitCommand(joints_mask:number) {
    if (this.machineState.current_state == CurrentState.DISCONNECTED) return;
    let command: JointInit = {
      mode: 0,
      joints_mask: joints_mask,
      reduction_factor: 0
    }
    this.topicJointInitCommand.publish(command);
  }

  async sendJogCommand(moveType: MoveType, target: Point, tool: string = '') {
    if (this.machineState.current_state != CurrentState.NOT_CALIBRATED){
      await this.clearQueue();
    }

    if (this.machineState.current_state == CurrentState.DISCONNECTED) return;
    let command: MovementCommand = {
      move_command:MoveCommand.EXE_JOGMOVE,
      move_type: moveType,
      ovr: 100,
      delay: 0,
      cartesian_linear_speed: 0,
      target: target,
      via: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type: 0, joints_data:[], joints_mask:0},
      tool: tool,
      frame: {x:0,y:0,z:0,a:0,e:0,r:0},
      remote_tool: 0
    }

    await this.checkMoveCommand(command);

    this.topicJogCommand.publish(command);
  }

  private async checkMoveCommand(command: MovementCommand):Promise<void>{
    if (typeof command.tool == 'string'){
      if (command.tool.length > 0){
        let tool:Tool = await this.toolsService.loadTool(command.tool);
        command.tool = tool.frame;
      }else{
        command.tool = {x:0, y:0, z:0, a:0, e:0, r:0};
      }
    }
  }

  private async sendMoveCommand(command: MovementCommand):Promise<void>{
    await this.checkMoveCommand(command);

    this.topicMoveCommand.publish(command);
  }

  sendSetJointId(joint: number): void {
    this.topicSetJointId.publish({
      data: joint
    });
  }

  sendSystemCommand(command: SystemCommand): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.serviceSystemCommand.callService(new Ros.ServiceRequest(command), (result)=>{
        resolve(result.res);
      }, (error)=>{
        reject(error);
      });
    });
  }

  async pushMoveCommand(command: MovementCommand, data:any): Promise<any> {
    let rosQueueItem = new MovementCommandQueueItem(command, data);

    this.running = true;

    if (this.waitingExecutedQueue.length == 0 && this.waitingReceiveQueue.length == 0){
      let rosResetQueueItem = new MovementCommandQueueItem({
        move_command:MoveCommand.CANCEL_MOVE,
        move_type: 0,
        ovr: 0,
        delay: 0,
        cartesian_linear_speed: 0,
        target: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
        via: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
        tool: {x:0,y:0,z:0,a:0,e:0,r:0},
        frame: {x:0,y:0,z:0,a:0,e:0,r:0},
        remote_tool: 0
      }, null);
      rosResetQueueItem.resolve = x => {};
      rosResetQueueItem.reject = x => {
        rosQueueItem.reject()
      };
      this.waitingReceiveQueue.push(rosResetQueueItem);
      this.waitingExecutedQueue.push(rosResetQueueItem);
      this.sendMoveCommand(rosResetQueueItem.message);
    }
    await this.checkMoveCommand(rosQueueItem.message);
    this.pendingQueue.push(rosQueueItem);

    return new Promise<number>((resolve, reject) => {
      rosQueueItem.resolve = resolve;
      rosQueueItem.reject = reject;
    });
  }

  pauseQueue(): Promise<any> {
    this.paused = true
    let rosQueueItem = new MovementCommandQueueItem({
      move_command:MoveCommand.PAUSE,
      move_type: 0,
      ovr: 0,
      delay: 0,
      cartesian_linear_speed: 0,
      target: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
      via: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
      tool: {x:0,y:0,z:0,a:0,e:0,r:0},
      frame: {x:0,y:0,z:0,a:0,e:0,r:0},
      remote_tool: 0
    }, null);

    this.waitingReceiveQueue.unshift(rosQueueItem);
    this.waitingExecutedQueue.unshift(rosQueueItem);
    this.sendMoveCommand(rosQueueItem.message);

    return new Promise<number>((resolve, reject) => {
      rosQueueItem.resolve = resolve;
      rosQueueItem.reject = reject;
    });
  }

  resumeQueue(): Promise<any> {
    this.paused = false
    let rosQueueItem = new MovementCommandQueueItem({
      move_command:MoveCommand.RESUME,
      move_type: 0,
      ovr: 0,
      delay: 0,
      cartesian_linear_speed: 0,
      target: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
      via: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
      tool: {x:0,y:0,z:0,a:0,e:0,r:0},
      frame: {x:0,y:0,z:0,a:0,e:0,r:0},
      remote_tool: 0
    }, null);

    this.waitingReceiveQueue.unshift(rosQueueItem);
    this.waitingExecutedQueue.unshift(rosQueueItem);
    this.sendMoveCommand(rosQueueItem.message);

    return new Promise<number>((resolve, reject) => {
      rosQueueItem.resolve = resolve;
      rosQueueItem.reject = reject;
    });
  }

  clearQueue(): Promise<number> {
    this.running = false;
    this.pendingQueue.splice(0, this.pendingQueue.length);
    if (this.waitingExecutedQueue.length > 0 || this.waitingReceiveQueue.length > 0 || this.paused){
      let rosQueueCancelItem = new MovementCommandQueueItem({
        move_command:MoveCommand.CANCEL_MOVE,
        move_type: 0,
        ovr: 0,
        delay: 0,
        cartesian_linear_speed: 0,
        target: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
        via: {cartesian_data:{x:0,y:0,z:0,a:0,e:0,r:0,config_flags:''}, data_type:0, joints_data:[], joints_mask:0},
        tool: {x:0,y:0,z:0,a:0,e:0,r:0},
        frame: {x:0,y:0,z:0,a:0,e:0,r:0},
        remote_tool: 0
      }, null);

      this.sendMoveCommand(rosQueueCancelItem.message);

      this.waitingReceiveQueue.splice(0, this.waitingReceiveQueue.length);
      this.waitingExecutedQueue.splice(0, this.waitingExecutedQueue.length);
      this.waitingReceiveQueue.unshift(rosQueueCancelItem);
      this.waitingExecutedQueue.unshift(rosQueueCancelItem);

      this.paused = false;

      return new Promise<number>((resolve, reject) => {
        rosQueueCancelItem.resolve = resolve;
        rosQueueCancelItem.reject = reject;
      });
    }else{
      return Promise.resolve(0);
    }
  }

  async getSwVersion():Promise<NodeSwVersionArray>{
    return new Promise<NodeSwVersionArray>((resolve, reject) => {
      this.serviceSwVersion.callService(new Ros.ServiceRequest({}), (result)=>{
        resolve(result.version);
      }, (error)=>{
        reject(error);
      });
    });
  }

  async sendControlSwitch(value:boolean){
    this.topicControlSwitch.publish({data:value});
  }
}
