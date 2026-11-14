const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

// reanimated 4는 worklets 위에 있고, worklets의 *.native.js 구현은 네이티브 바인딩이 있어야 로드된다.
// jest에는 그게 없어서 require 단계에서 죽는다. worklets가 제공하는 회피책(.native 확장자 배제)을
// RN preset resolver 위에 얹는다 — preset resolver를 통째로 갈아끼우면 react-native의
// exports 우회(RFC0894 하위호환)가 사라진다.
module.exports = (request, options) => {
  const isWorklets =
    options.basedir.includes('react-native-worklets') || request.includes('react-native-worklets');

  if (!isWorklets) {
    return reactNativeResolver(request, options);
  }

  return reactNativeResolver(request, {
    ...options,
    extensions: options.extensions?.filter((ext) => !ext.includes('native')),
  });
};
