"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var HighLatitudeRule = {
  MiddleOfTheNight: 'middleofthenight',
  SeventhOfTheNight: 'seventhofthenight',
  TwilightAngle: 'twilightangle',
  recommended: function recommended(coordinates) {
    if (coordinates.latitude > 48) {
      return HighLatitudeRule.SeventhOfTheNight;
    } else {
      return HighLatitudeRule.MiddleOfTheNight;
    }
  }
};
var _default = exports["default"] = HighLatitudeRule;
//# sourceMappingURL=HighLatitudeRule.js.map