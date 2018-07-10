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


import { Component, ViewChildren, QueryList } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { _ } from '../../utils';
import { TranslateService } from '@ngx-translate/core';
import { Frame } from '../../services';
import { ToolsService, Tool,  } from '../../services/tools.service';
import * as Utils from '../../utils';




@Component({
  selector: 'page-settings-tools-list',
  templateUrl: 'settings-tools-list.html',
  providers: [ToolsService]
})
export class SettingsToolsListPage {

  private sorting:boolean = false;
  tools: Tool[];
  @ViewChildren('slidingItems') private slidingItems: QueryList<any>;

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    private translateService: TranslateService,
    public alertCtrl: AlertController,
    private toolService: ToolsService) {
  }

  private ionViewWillEnter() {
    this.refreshList();
  }

  private inizializeTools() {
    this.tools = new Array<Tool>();
  }


  private async refreshList() {
    try{
      this.tools = await this.toolService.load();

      if (this.tools == null) {
        this.inizializeTools();
      }
    }catch(err){
      this.inizializeTools();
    }
  }

  private async itemReorder(event: any) {
    await this.toolService.reorder(event.from, event.to);
    this.refreshList();
  }

  private itemDelete(i: number, tool: Tool) {
    this.closeAllItems()
    let confirm = this.alertCtrl.create({
      title: this.translateService.instant(_('tool-delete-title')),
      message: this.translateService.instant(_('tool-delete-message'), {name : tool.name}) ,
      buttons: [
        { text: this.translateService.instant(_('tool-cancel')) },
        {
          text: this.translateService.instant(_('tool-confirm')),
          handler: () => {
            this.toolService.delete(tool).then(_ => this.refreshList());
            // TODO: show a toast indicating the success or the failure
          }
        }
      ],
      enableBackdropDismiss: false
    });
    confirm.present();
  }

  private editPropertyName(tool: Tool, propertyName: string, propertyTranslationKey) {
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('tool-edit')),
      inputs: [
        {
          name: 'newValue',
          placeholder: propertyName,
          value: tool[propertyName],
          type: 'text',
        },
      ],
      buttons: [
        {
          text: this.translateService.instant(_('tool-cancel')),
          role: 'cancel',
        },
        {
          text: this.translateService.instant(_('tool-edit-property'), { name: this.translateService.instant(_(propertyTranslationKey)) }),
          handler: data => {
            if (data.newValue=="") {
              alert.setMessage(this.translateService.instant(_("tool-error-request-data")))
              return false;
            }
            tool[propertyName] = data.newValue;
            this.toolService.save(tool);
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  private editPropertyFrame(tool: Tool, propertyName: string) {
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('tool-edit')),
      inputs: [
        {
          name: 'newValue',
          placeholder: propertyName,
          value: (tool.frame[propertyName]!=0)? tool.frame[propertyName]: null,
          type: 'number',
        },
      ],
      buttons: [
        {
          text: this.translateService.instant(_('tool-cancel')),
          role: 'cancel'
        },
        {
          text: this.translateService.instant(_('tool-edit-property'), { 'name': propertyName }),
          handler: data => {
            if (data.newValue == "") {
              alert.setMessage(this.translateService.instant(_("tool-error-request-data")))
              return false;
            }
            tool.frame[propertyName] = parseFloat(data.newValue);
            this.toolService.save(tool);
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  private closeAllItems() {
    this.slidingItems.forEach((item) => { item.close(); });
  }

  public toggleSort() {
    this.sorting = !this.sorting;
  }

  private itemCreate() {
    let alert = this.alertCtrl.create({
      title: this.translateService.instant(_('tool-create')),
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: this.translateService.instant(_('tool-name')),
        }
      ],
      buttons: [
        {
          text: this.translateService.instant(_('tool-cancel')),
          role: 'cancel'
        },
        {
          text: this.translateService.instant(_('tool-add')),
          handler: data => {
            if (data.name == "") {
              alert.setMessage(this.translateService.instant(_("tool-error-request-data")))
              return false;
            }
            this.toolService.save({id: Utils.uuidGenerator(), name: data.name, frame: { x: 0, y: 0, z: 0, a: 0, e: 0, r: 0 } }).then(_ => this.refreshList());
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }


}
