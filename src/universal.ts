import { CONTROLLER, FACTORY, PROVIDER, SERVICE, SET_TYPE } from './symbols.ts';
import { SetType } from "./type.ts";

export class Provider {
  static [SET_TYPE]() {
    if (typeof this == "function") 
      SetType(PROVIDER)(this)
  }
}
export class Controller {
  static [SET_TYPE]() {
    if (typeof this == "function") 
      SetType(CONTROLLER)(this)
  }
}

export class Service {
  static [SET_TYPE]() {
    if (typeof this == "function") 
      SetType(SERVICE)(this)
  }
}

export class Factory {
  static [SET_TYPE]() {
    if (typeof this == "function") 
      SetType(FACTORY)(this)
  }
}