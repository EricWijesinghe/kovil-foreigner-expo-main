package kr.co.kovil.core

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Exposes the Rust core to JavaScript. When the native library is missing every call returns NaN (JS falls back). */
class KovilCoreModule : Module() {
  private inline fun call(block: () -> Double): Double =
    if (!KovilNative.loaded) Double.NaN else try { block() } catch (e: Throwable) { Double.NaN }

  override fun definition() = ModuleDefinition {
    Name("KovilCore")

    Function("isAvailable") { KovilNative.loaded }
    Function("version") { call { KovilNative.version() } }
    Function("convertRent") { deposit: Double, rent: Double, newDeposit: Double, ratePct: Double ->
      call { KovilNative.convertRent(deposit, rent, newDeposit, ratePct) }
    }
    Function("jeonseEquivalent") { deposit: Double, rent: Double, ratePct: Double ->
      call { KovilNative.jeonseEquivalent(deposit, rent, ratePct) }
    }
    Function("agentFeeCap") { deposit: Double, rent: Double -> call { KovilNative.agentFeeCap(deposit, rent) } }
    Function("distanceM") { aLat: Double, aLng: Double, bLat: Double, bLng: Double ->
      call { KovilNative.distanceM(aLat, aLng, bLat, bLng) }
    }
    Function("inKorea") { lat: Double, lng: Double -> call { KovilNative.inKorea(lat, lng) } }
  }
}
