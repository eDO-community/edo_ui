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

import { Input, Output, EventEmitter, Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RosService } from '../../services';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'edo-numeric-keypad',
  templateUrl: 'edo-numeric-keypad.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EDONumericKeypad {
  private _value:string;

  private firstTime:boolean = true;

  @Output('valueChange') valueChange: EventEmitter<string>;

  constructor(private ref: ChangeDetectorRef) {
    this.valueChange = new EventEmitter<string>();
  }

  ngOnDestroy(){

  }

  @Input()
  public set value(value: string) {
    if (value == null || value == undefined){
      value = "";
    }
    if (this._value != value){
      this.firstTime = true;
      this._value = value;
      this.ref.markForCheck();
    }
  }

  public get value() {
    return this._value;
  }

  private onInputNumber(input:string){
    if (this.firstTime){
      if (input == '.'){
        this._value = '0.';
      }else{
        this._value = input;
      }
    }else{
      if (input == '.'){
        if (this._value.indexOf('.') >= 0){
          return;
        }
      }else if (input == '-'){
        if (this._value.length > 0){
          return;
        }
      }
      this._value = this._value + input;
    }
    this.valueChange.next(this._value);
    this.firstTime = false;
    this.ref.markForCheck();
  }

  private onInputBackspace(){
    if (this.value.length > 0){
      this._value = this._value.substring(0, this._value.length - 1);
      this.valueChange.next(this._value);
      this.firstTime = false;
      this.ref.markForCheck();
    }
  }
}
