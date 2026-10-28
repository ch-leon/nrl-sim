// src/vendor/phaser-slim.js — the Phaser the production build ships (#400).
//
// `import Phaser from 'phaser'` resolves here in `vite build` (vite.config.ts's
// alias); the dev server and vitest keep the package's full build. It is Phaser's
// own `src/phaser-core.js` plus the two game objects the game draws with that core
// leaves out (particles for the atmosphere and build dust, a blitter for the
// crowd), and without what the game never runs: physics (Arcade and Matter),
// tilemaps, the Phaser sound manager (src/fx/audio.ts plays its own WebAudio),
// tweens, curves, geometry helpers, the gamepad, the loader's file types and
// every other game object. Types still come from the package (tsc reads `phaser`'s own .d.ts), so
// a scene reaching for something left out here type-checks and then fails in the
// build: add the namespace below, with what uses it.
//
// The compile-time flags in Phaser's source (`typeof WEBGL_RENDERER` and the rest)
// are set by the nrl-phaser-flags plugin in vite.config.ts. Plain JS, not TS: the
// imports are Phaser's CommonJS modules, which have no types of their own.
import 'phaser/src/polyfills/requestVideoFrame';
import CONST from 'phaser/src/const';
import Extend from 'phaser/src/utils/object/Extend';

import Animations from 'phaser/src/animations';
import BlendModes from 'phaser/src/renderer/BlendModes';
import Cache from 'phaser/src/cache';
import Scene2D from 'phaser/src/cameras/2d';
import Core from 'phaser/src/core';
import Class from 'phaser/src/utils/Class';
import Data from 'phaser/src/data';
import Masks from 'phaser/src/display/mask';
import DOM from 'phaser/src/dom';
import Events from 'phaser/src/events';
import FX from 'phaser/src/fx';
import Game from 'phaser/src/core/Game';
import InputConst from 'phaser/src/input/const';
import CreatePixelPerfectHandler from 'phaser/src/input/CreatePixelPerfectHandler';
import CreateInteractiveObject from 'phaser/src/input/CreateInteractiveObject';
import InputEvents from 'phaser/src/input/events';
import InputManager from 'phaser/src/input/InputManager';
import InputPlugin from 'phaser/src/input/InputPlugin';
import InputPluginCache from 'phaser/src/input/InputPluginCache';
import Keyboard from 'phaser/src/input/keyboard';
import Mouse from 'phaser/src/input/mouse';
import Pointer from 'phaser/src/input/Pointer';
import Touch from 'phaser/src/input/touch';
import Plugins from 'phaser/src/plugins';
import Renderer from 'phaser/src/renderer';
import Scale from 'phaser/src/scale';
import ScaleModes from 'phaser/src/renderer/ScaleModes';
import Scene from 'phaser/src/scene/Scene';
import Scenes from 'phaser/src/scene';
import Structs from 'phaser/src/structs';
import Textures from 'phaser/src/textures';
import Time from 'phaser/src/time';

import DisplayList from 'phaser/src/gameobjects/DisplayList';
import GameObjectCreator from 'phaser/src/gameobjects/GameObjectCreator';
import GameObjectFactory from 'phaser/src/gameobjects/GameObjectFactory';
import UpdateList from 'phaser/src/gameobjects/UpdateList';
import Components from 'phaser/src/gameobjects/components';
import BuildGameObject from 'phaser/src/gameobjects/BuildGameObject';
import BuildGameObjectAnimation from 'phaser/src/gameobjects/BuildGameObjectAnimation';
import GameObject from 'phaser/src/gameobjects/GameObject';
import Blitter from 'phaser/src/gameobjects/blitter/Blitter';
import Bob from 'phaser/src/gameobjects/blitter/Bob';
import Graphics from 'phaser/src/gameobjects/graphics/Graphics';
import Image from 'phaser/src/gameobjects/image/Image';
import Particles from 'phaser/src/gameobjects/particles';
import Sprite from 'phaser/src/gameobjects/sprite/Sprite';
import Text from 'phaser/src/gameobjects/text/Text';
import BlitterFactory from 'phaser/src/gameobjects/blitter/BlitterFactory';
import GraphicsFactory from 'phaser/src/gameobjects/graphics/GraphicsFactory';
import ImageFactory from 'phaser/src/gameobjects/image/ImageFactory';
import ParticleEmitterFactory from 'phaser/src/gameobjects/particles/ParticleEmitterFactory';
import SpriteFactory from 'phaser/src/gameobjects/sprite/SpriteFactory';
import TextFactory from 'phaser/src/gameobjects/text/TextFactory';
import BlitterCreator from 'phaser/src/gameobjects/blitter/BlitterCreator';
import GraphicsCreator from 'phaser/src/gameobjects/graphics/GraphicsCreator';
import ImageCreator from 'phaser/src/gameobjects/image/ImageCreator';
import ParticleEmitterCreator from 'phaser/src/gameobjects/particles/ParticleEmitterCreator';
import SpriteCreator from 'phaser/src/gameobjects/sprite/SpriteCreator';
import TextCreator from 'phaser/src/gameobjects/text/TextCreator';

const Phaser = Extend(false, {
  Animations,
  BlendModes,
  Cache,
  Cameras: { Scene2D },
  Core,
  Class,
  Data,
  Display: { Masks },
  DOM,
  Events,
  FX,
  Game,
  // The game draws with add.image, add.sprite, add.graphics, add.text,
  // add.particles and add.blitter; each needs its factory registered.
  GameObjects: {
    DisplayList,
    GameObjectCreator,
    GameObjectFactory,
    UpdateList,
    Components,
    BuildGameObject,
    BuildGameObjectAnimation,
    GameObject,
    Blitter,
    Bob,
    Graphics,
    Image,
    Particles,
    Sprite,
    Text,
    Factories: { Blitter: BlitterFactory, Graphics: GraphicsFactory, Image: ImageFactory, Particles: ParticleEmitterFactory, Sprite: SpriteFactory, Text: TextFactory },
    Creators: { Blitter: BlitterCreator, Graphics: GraphicsCreator, Image: ImageCreator, Particles: ParticleEmitterCreator, Sprite: SpriteCreator, Text: TextCreator },
  },
  // Phaser's input/index.js without its Gamepad plugin (the game never turns on
  // input.gamepad); Keyboard stays for the grounds' Esc.
  Input: Extend(false, {
    CreatePixelPerfectHandler,
    CreateInteractiveObject,
    Events: InputEvents,
    InputManager,
    InputPlugin,
    InputPluginCache,
    Keyboard,
    Mouse,
    Pointer,
    Touch,
  }, InputConst),
  Plugins,
  Renderer,
  Scale,
  ScaleModes,
  Scene,
  Scenes,
  Structs,
  Textures,
  Time,
}, CONST);

// As Phaser's own entry does (a few plugins look for window.Phaser).
globalThis.Phaser = Phaser;

export default Phaser;
