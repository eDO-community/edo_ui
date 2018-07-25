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

import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { NavController, PopoverController, AlertController, ViewController, NavParams } from 'ionic-angular';
import { WaypointsDetailPage } from '../waypoints-detail/waypoints-detail';
import { WaypointsService, WaypointPath } from '../../services';
import { TranslateService } from '@ngx-translate/core';

import * as Utils from '../../utils';
import { _ } from '../../utils';

@Component({
  selector: 'page-waypoints-list',
  templateUrl: 'waypoints-list.html',
  providers: [WaypointsService]
})
export class WaypointsListPage {
  private waypointPaths: Array<WaypointPath> = [];
  private sorting:boolean = false;
  private loaded: boolean = false

  @ViewChildren('slidingItems') private slidingItems: QueryList<any>;

  constructor(public navCtrl: NavController, private popoverCtrl: PopoverController,
    private alertCtrl: AlertController, private service: WaypointsService,
    private translateService: TranslateService) {

  }

  private ionViewWillEnter() {
    this.refreshList();
  }

  private async refreshList() {
    this.waypointPaths = await this.service.load();
    this.loaded = true
  }

  private itemSelected(i, item) {
    this.navCtrl.push(WaypointsDetailPage, { path: item });
  }

  private itemDelete(i: number, item: WaypointPath) {
    this.closeAllItems();
    let confirm = this.alertCtrl.create({
      title: this.translateService.instant(_('waypoints-delete-title')),
      message: this.translateService.instant(_('waypoints-delete-message'), {name: item.name}),
      buttons: [
        { text: this.translateService.instant(_('waypoints-cancel')) },
        { text: this.translateService.instant(_('waypoints-confirm')),
          handler: () => {
            this.service.delete(item).then(_ => this.refreshList());
            // TODO: show a toast indicating the success or the failure
          }
        }
      ],
      enableBackdropDismiss: false
    });
    confirm.present();
  }

  private itemCreate() {
    this.closeAllItems();
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('waypoints-new')),
      inputs: [
        {
          name: 'name',
          placeholder: this.translateService.instant(_('waypoints-name'))
        }
      ],
      buttons: [
        {
          text:  this.translateService.instant(_('waypoints-cancel')),
          role: 'cancel'
        },
        {
          text: this.translateService.instant(_('waypoints-create')),
          handler: data => {
            this.navCtrl.push(WaypointsDetailPage, { path : new WaypointPath(data.name) });
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  private itemClone(i: number, path: WaypointPath){
    this.closeAllItems();
    let alert = this.alertCtrl.create({
      title: this.translateService.instant('waypoints-clone-title'),
      message: this.translateService.instant('waypoints-clone-description') + ` ${path.name}`,
      inputs: [
        {
          name: 'name',
          placeholder: this.translateService.instant('waypoints-name'),
          value: path.name,
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('waypoints-disagree'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('waypoints-agree'),
          handler: data => {
            var newPath = new WaypointPath(data.name, path.waypoints)
            this.navCtrl.push(WaypointsDetailPage, { path : newPath });
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
}

  private async itemReorder(event:any){
    await this.service.reorder(event.from, event.to);
    this.refreshList();
  }

  public toggleSort(){
    this.sorting = !this.sorting;
  }

  private closeAllItems(){
    this.slidingItems.forEach((item) => {item.close();});
  }

  private presentPopover(myEvent){
    let popover = this.popoverCtrl.create(WaypointsListPopover, {callback: () => {this.refreshList()}});
    popover.present({
      ev: myEvent,
    });
  }
}

@Component({
  template: `
    <ion-list>
      <button ion-item (click)="export()">Export all to SD</button>
      <button ion-item (click)="import()">Import all from SD</button>
    </ion-list>
  `,
  providers: [WaypointsService]
})
export class WaypointsListPopover {
  constructor(public viewCtrl: ViewController,
    private alertCtrl: AlertController,
    private translateService: TranslateService,
    private service: WaypointsService,
    private navParams: NavParams) {

  }

  async export() {
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('waypoints-export-title')),
      buttons: [],
      enableBackdropDismiss: false
    });
    alert.addButton({
      text: this.translateService.instant(_('waypoints-export-confirm')),
      handler: () => {
        this.service.export(this.navParams.get('callback'));
      }
    });
    alert.addButton({
      text: this.translateService.instant(_('waypoints-export-dismiss')),
    });
    alert.present();

    this.viewCtrl.dismiss();
  }

  async import() {
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('waypoints-import-title')),
      buttons: [],
      enableBackdropDismiss: false
    });
    alert.addButton({
      text: this.translateService.instant(_('waypoints-import-confirm')),
      handler: () => {
        this.service.import(this.navParams.get('callback'));
      }
    });
    alert.addButton({
      text: this.translateService.instant(_('waypoints-import-dismiss')),
    });
    alert.present();

    this.viewCtrl.dismiss();
  }
}
