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

import { Globalization } from '@ionic-native/globalization';
import { TranslateService } from '@ngx-translate/core';


/**
 * Setting keys used with underlying storage
 */
export enum SettingsKeys {
  INITIALIZED = "initialized",
  WS_SERVICE_URL = "ws_service_url",
  WS_SERVICE_PORT = "ws_service_port",
  WAYPOINTS = "waypoints",
  PLUGINS_ENABLED = "plugins_enabled",
  LANGUAGE = "language"
}

export const DEFAULT_LANGUAGE: string = "en";
export const DEFAULT_IP: string = "192.168.12.1";
export const DEFAULT_PORT: string = "9090";
export const AVAILABLE_LANGUAGES: Array<{code:string, name:string}> = [{code: 'en', name: 'English'}, {code: 'it', name: 'Italian'}];
/**
 * Dummy function to extract translations
 */
export function _(key: string): string {
  return key;
}

/**
 * Deep clone an array
 */
export function cloneArray(array: Array<any>): Array<any> {
  return array.map(object => typeof object === 'object' ? Object.assign({}, object) : object);
}

/**
 * Clone an object
 */
export function cloneObject(object: object): object {
  return Object.assign({}, object);
}

/**
 * Clone an object or deep clone an array
 */
export function clone(object: object | Array<any>): object | Array<any> {
  return Array.isArray(object) ? cloneArray(object) : cloneObject(object);
}

/**
 * Get preferrend language using cordova data if available or browser language
 */
export async function getPreferredLanguage(globalization:Globalization, translateService:TranslateService):Promise<string>{
  if ((<any>window).cordova) {
    var preferredLanguage:{value: string;} = await globalization.getPreferredLanguage();
    return getSuitableLanguage(preferredLanguage.value);
  } else {
    let browserLanguage = translateService.getBrowserLang() || DEFAULT_LANGUAGE;
    return getSuitableLanguage(browserLanguage);
  }
}

/**
 * Return language if it's available or the default language
 */
function getSuitableLanguage(language) {
  language = language.substring(0, 2).toLowerCase();
  return AVAILABLE_LANGUAGES.some(x => x.code == language) ? language : DEFAULT_LANGUAGE;
}

/**
 * Generate a UUID v4 as string using WebCrypto API (if available) or fallback
 * to Math.random.
 */
export function uuidGenerator(): string {
  let toHex = (value) => (value + 0x100).toString(16).substr(1);
  let toUUID = (buffer) => {
    let i = 0;
    return toHex(buffer[i++]) + toHex(buffer[i++]) + toHex(buffer[i++]) + toHex(buffer[i++]) + '-' +
      toHex(buffer[i++]) + toHex(buffer[i++]) + '-' +
      toHex(buffer[i++]) + toHex(buffer[i++]) + '-' +
      toHex(buffer[i++]) + toHex(buffer[i++]) + '-' +
      toHex(buffer[i++]) + toHex(buffer[i++]) + toHex(buffer[i++]) + toHex(buffer[i++]) + toHex(buffer[i++]) + toHex(buffer[i++]);
  }

  var webCrypto = window.crypto || window['msCrypto'];

  var buffer;
  if (webCrypto && webCrypto.getRandomValues) {
    try {
      buffer = webCrypto.getRandomValues(new Uint8Array(16));
    } catch (e) { }
  }

  if (!buffer) {
    buffer = new Array(16);
    for (var j = 0, r; j < 16; j++) {
      if ((j & 0x03) === 0) {
        r = Math.random() * 0x100000000;
      }
      buffer[j] = r >>> ((j & 0x03) << 3) & 0xff;
    }
  }

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  buffer[6] = (buffer[6] & 0x0f) | 0x40;
  buffer[8] = (buffer[8] & 0x3f) | 0x80;

  return toUUID(buffer);
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

//FIXME: cache this value
export function isIE():boolean{
  var ua = window.navigator.userAgent;
  if (ua.indexOf('MSIE ') > 0){
    return true;
  }else if (ua.indexOf('Trident/') > 0){
    return true;
  }else if (ua.indexOf('Edge/') > 0){
    return true;
  }

  return false;
}

export function EDOShowInMenu( label : string, icon: string ) : ClassDecorator {
  return function ( target : any ) {
    Object.defineProperty(target.prototype, 'EDOShowInMenu', {value: {title: label, icon: icon}})
  }
}
