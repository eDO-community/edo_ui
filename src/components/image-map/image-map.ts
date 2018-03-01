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

import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import * as Utils from '../../utils';

@Component({
  selector: 'img-map',
  templateUrl: 'image-map.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageMapComponent {
  @ViewChild('imgElement') image: ElementRef;
  @Input() coords: Array<Array<number>>;
  @Input() src: string;
  @Output('mapclick') clickEvent = new EventEmitter<number>();

  private mapId: string = Utils.uuidGenerator();
  private imageWidth: number;
  private imageHeight: number;
  private width: number;
  private height: number;
  private scaledCoords: Array<Array<number>>;

  constructor(private ref: ChangeDetectorRef) {
    this.scaledCoords = this.coords;
  }

  ngAfterViewInit() {
    this.image.nativeElement.addEventListener('load', () => this.handleImageLoad());
  }

  handleImageLoad() {
    this.imageWidth = this.image.nativeElement.naturalWidth;
    this.imageHeight = this.image.nativeElement.naturalHeight;
    this.width = this.image.nativeElement.offsetWidth;
    this.height = this.image.nativeElement.offsetHeight;
    this.onResize();
  }

  @HostListener('window:resize', ['$event.target'])
  onResize() {
    let scaleWidth = this.width / this.imageWidth;
    let scaleHeight = this.height / this.imageHeight;
    this.scaledCoords = this.coords.map(a => a.map((x, i) => {
      if (i % 2 === 0) return Math.round(x * scaleWidth);
      else return Math.round(x * scaleHeight);
    }));
    this.ref.markForCheck();
  }

  onMapClick(event: Event, i: number) {
    event.preventDefault();
    this.clickEvent.emit(i);
  }
}
