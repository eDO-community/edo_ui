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

import { Directive, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';
import * as Utils from '../utils';

/**
 * Directive that fire an event every 30 ms while holding a button
 */
@Directive({ selector: '[hold]', exportAs:'holdRef'  })
export class HoldDirective {
  @Output('holding') holding = new EventEmitter<number>();
  @Output('holdingStart') holdingStart = new EventEmitter<number>();
  @Output('holdingCancel') holdingCancel = new EventEmitter<number>();

  private value:number = 0;
  private lastTimeStamp:number = null;

  private onAnimationFrame:FrameRequestCallback;

  constructor(private el: ElementRef) {
    this.onAnimationFrame = (timestamp) => {
      if (this.lastTimeStamp !== null){
        window.requestAnimationFrame(this.onAnimationFrame);

        if ((timestamp - this.lastTimeStamp) >= 30){
          this.lastTimeStamp = timestamp;
          this.value += 1;
          this.holding.emit(this.value);
        }
      }
    }
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onHoldStart(event:Event) {
    if (this.lastTimeStamp === null) {
      this.lastTimeStamp = 0;
      window.requestAnimationFrame(this.onAnimationFrame);
      this.holdingStart.emit(this.value);
    }
  }

  @HostListener('mouseleave', ['$event'])
  @HostListener('mouseup', ['$event'])
  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  @HostListener('document:pause', ['$event'])
  onHoldEnd(event:Event) {
    //We ignore mouse leave in IE cause it will sent mouse up event if the touch get released outside the button
    if (event.type == 'mouseleave' && Utils.isIE())
      return;

    if (this.lastTimeStamp !== null){
      this.lastTimeStamp = null;
      this.value = 0;
      this.holdingCancel.emit(this.value);
    }
  }
}
