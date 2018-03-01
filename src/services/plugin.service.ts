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

import { Injectable, Component, Compiler, ViewChild, ViewContainerRef, ComponentFactoryResolver, Injector } from '@angular/core';
import { IonicPage, Nav } from 'ionic-angular';
import { ModuleWithComponentFactories } from '@angular/core/src/linker/compiler';
import { ModuleLoader } from 'ionic-angular/util/module-loader';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Http } from '@angular/http';
import { SettingsKeys } from '../utils/index';
import { Storage } from '@ionic/storage';

declare var document: any;

export type Plugin = {
  id: string;
  name: string;
  enabled: boolean;
};

@Injectable()
export class PluginService {
  private embeddedPlugins:any[] = [
  ];
  private plugins:any = {};
  private menuItems:any = {};

  constructor(private compiler: Compiler,
    private componentFactoryResolver: ComponentFactoryResolver, private moduleLoader:ModuleLoader,
    private injector: Injector, private translateService:TranslateService, private http:Http,
    private storage: Storage) {
  }

  public async getEnabledPlugins():Promise<string[]> {
    return await this.storage.get(SettingsKeys.PLUGINS_ENABLED) || [];
  }

  public async enablePlugin(pluginId:string):Promise<void> {
    let enabledPlugins:string[] = await this.getEnabledPlugins();
    if (enabledPlugins.indexOf(pluginId) < 0){
      enabledPlugins.push(pluginId);
      enabledPlugins.sort();
      await this.storage.set(SettingsKeys.PLUGINS_ENABLED, enabledPlugins);
    }
  }

  public async disablePlugin(pluginId:string):Promise<void> {
    let enabledPlugins:string[] = await this.getEnabledPlugins();
    enabledPlugins = enabledPlugins.filter(item => item !== pluginId);
    await this.storage.set(SettingsKeys.PLUGINS_ENABLED, enabledPlugins);
  }

  public async getPlugins():Promise<Plugin[]> {
    let plugins:Plugin[] = [];
    let enabledPlugins:string[] = await this.getEnabledPlugins();
    for (var plugin in this.embeddedPlugins){
      let pluginId = this.embeddedPlugins[plugin].id;
      plugins.push({id: pluginId, name:this.embeddedPlugins[plugin].name, enabled: (enabledPlugins.indexOf(pluginId) > -1)})
    }
    return plugins;
  }

  public async loadPlugins():Promise<any>{
    let loadedPlugins:string[] = [];
    let enabledPlugins:string[] = await this.getEnabledPlugins();
    for (var plugin in enabledPlugins){
      try{
        await this.loadPlugin(enabledPlugins[plugin]);
        loadedPlugins.push(enabledPlugins[plugin]);
      }catch(e){
        this.disablePlugin(enabledPlugins[plugin]);
      }
    }
    return this.menuItems;
  }

  private async loadPlugin(pluginId: string):Promise<any> {
    if (!this.plugins[pluginId]){
      this.plugins[pluginId] = {
        loaded: false,
        jssrc: "assets/plugins/" + pluginId + "/" + pluginId + ".umd.js",
        csssrc: "assets/plugins/" + pluginId + "/" + pluginId + ".css"
      }
    }

    //resolve if already loaded
    if (this.plugins[pluginId] && this.plugins[pluginId].loaded) {
        return;
    } else {
      let style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = this.plugins[pluginId].csssrc;
      document.getElementsByTagName('head')[0].appendChild(style);

      //load script
      await new Promise((resolve, reject) => {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = this.plugins[pluginId].jssrc;
        if (script.readyState) {  //IE
            script.onreadystatechange = () => {
                if (script.readyState === "loaded" || script.readyState === "complete") {
                    script.onreadystatechange = null;
                    this.plugins[pluginId].loaded = true;
                    resolve();
                }
            };
        } else {  //Others
            script.onload = () => {
                this.plugins[pluginId].loaded = true;
                resolve();
            };
        }
        script.onerror = (error: any) => reject();
        document.getElementsByTagName('head')[0].appendChild(script);
      });

      await this.compilePlugin(pluginId);

      var loader:TranslateHttpLoader = new TranslateHttpLoader(this.http, './assets/plugins/' + pluginId + '/', '.json');
      var resourceEN:any = await loader.getTranslation('en').toPromise();
      this.translateService.setTranslation('en', resourceEN, true);
      var resourceIT:any = await loader.getTranslation('it').toPromise();
      this.translateService.setTranslation('it', resourceIT, true);
    }
  }

  private async compilePlugin(pluginId:string):Promise<any>{
    var moduleName;
    if (pluginId.startsWith('edo-')){
      moduleName = "EDO" + pluginId.slice(3).replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); }) + "Module";
    }else{
      moduleName = pluginId.charAt(0).toUpperCase() + pluginId.slice(1).replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); }) + "Module";
    }
    //SEE: https://gist.github.com/brandonroberts/02cc07face25886fe142c4dbd8da1340
    var factory:ModuleWithComponentFactories<{}> = await this.compiler.compileModuleAndAllComponentsAsync(window[pluginId][moduleName]);

    const ref = factory.ngModuleFactory.create(this.injector);

    const pluginComponentFactories = (<any>factory).componentFactories.filter(e => e.selector.match('page-' + pluginId + '.*'));

    pluginComponentFactories.forEach(pluginComponentFactory => {
      this.moduleLoader._cfrMap.set(pluginComponentFactory.componentType, ref.componentFactoryResolver);
      if (pluginComponentFactory.componentType.prototype.EDOShowInMenu){
        this.menuItems[pluginComponentFactory.selector] = {
          title: pluginComponentFactory.componentType.prototype.EDOShowInMenu.title,
          componentType: pluginComponentFactory.componentType,
          icon: pluginComponentFactory.componentType.prototype.EDOShowInMenu.icon
        };
      }
    });
  }
}
