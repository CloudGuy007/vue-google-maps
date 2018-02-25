import mapValues from 'lodash/mapValues'
import forIn from 'lodash/forIn'
import WatchedObjectWrapper from '../utils/WatchedObjectWrapper'

function capitalizeFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function getPropsValues (vueInst) {
  return mapValues(vueInst.$options.props, (v, k) => vueInst[k])
}

/**
  * Binds the properties defined in props to the google maps instance.
  * If the prop is an Object type, and we wish to track the properties
  * of the object (e.g. the lat and lng of a LatLng), then we do a deep
  * watch. For deep watch, we also prevent the _changed event from being
  * emitted if the data source was external.
  */
export function bindProps(vueInst, googleMapsInst, props, options) {
  const {afterModelChanged} = options || {}
  forIn(props, ({twoWay, type, trackProperties}, attribute) => {
    const setMethodName = 'set' + capitalizeFirstLetter(attribute)
    const getMethodName = 'get' + capitalizeFirstLetter(attribute)
    const eventName = attribute.toLowerCase() + '_changed'
    const initialValue = vueInst[attribute]

    if (typeof googleMapsInst[setMethodName] === 'undefined') {
      throw new Error(`${setMethodName} is not a method of (the Maps object corresponding to) ${vueInst.$options._componentTag}`)
    }

    // We need to avoid an endless
    // propChanged -> event emitted -> propChanged -> event emitted loop
    // although this may really be the user's responsibility
    var timesSet = 0
    if (type !== Object || !trackProperties) {
      // Track the object deeply
      vueInst.$watch(attribute, () => {
        const attributeValue = vueInst[attribute]

        timesSet++
        googleMapsInst[setMethodName](attributeValue)
        if (afterModelChanged) {
          afterModelChanged(attribute, attributeValue)
        }
      }, {
        immediate: typeof initialValue !== 'undefined',
        deep: type === Object
      })
    } else {
      WatchedObjectWrapper(
        vueInst,
        trackProperties.map(prop => `${attribute}.${prop}`),
        () => {
          googleMapsInst[setMethodName](vueInst[attribute])
        },
        vueInst[attribute] !== undefined
      )
    }

    if (twoWay &&
        vueInst.$gmapOptions.autobindAllEvents ||
        vueInst.$listeners[eventName]) {
      googleMapsInst.addListener(eventName, (ev) => { // eslint-disable-line no-unused-vars
        vueInst.$emit(eventName, googleMapsInst[getMethodName]())
      })
    }
  })
}
