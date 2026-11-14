package kr.co.kovil.core

/** JNI bindings to the Rust core (modules/kovil-core/rust). Every function returns NaN on bad input or panic. */
object KovilNative {
  val loaded: Boolean = try {
    System.loadLibrary("kovil_core")
    true
  } catch (e: Throwable) {
    false
  }

  @JvmStatic external fun convertRent(deposit: Double, rent: Double, newDeposit: Double, ratePct: Double): Double
  @JvmStatic external fun jeonseEquivalent(deposit: Double, rent: Double, ratePct: Double): Double
  @JvmStatic external fun agentFeeCap(deposit: Double, rent: Double): Double
  @JvmStatic external fun distanceM(aLat: Double, aLng: Double, bLat: Double, bLng: Double): Double
  @JvmStatic external fun inKorea(lat: Double, lng: Double): Double
  @JvmStatic external fun version(): Double
}
