const EventEmitter = require('events')
const {
  TASK_CHANGE_STATUS_EVENT,
  REACTOR_STEP_START_EVENT,
  REACTOR_STEP_END_EVENT,
  REACTOR_STEP_ERROR,
  TASK_ADDED_NEW_STEP_EVENT,
  TASK_PROCESSING,
  TASK_STARTING,
  TASK_STOPING,
  TASK_STOPED,
} = require('./constants')
const delay = require('delay')
const statusSymbol = Symbol('reactorStatus')
const stepsSymbol = Symbol('reactorSteps')
const lifeCycleSymbol = Symbol('reactorSteps')


/**
 * @description
 * lifeCycle
 *
 * @param {Object} options
 *
 * @event TASK_CHANGE_STATUS_EVENT
 * @event REACTOR_STEP_START_EVENT
 * @event REACTOR_STEP_END_EVENT
 * @event REACTOR_STEP_ERROR
 * @event TASK_ADDED_NEW_STEP_EVENT
 */
class Reactor extends EventEmitter {
  constructor(options={}) {
    super()
    /** @property {Integer} stepTimeout Таймаут мажду шагами таски */
    this.stepTimeout = 10
    /** @private {Array<Function>} Шаги выполнения задачи */
    this[stepsSymbol] = []
    /** @private {String} Статус таски */
    this[statusSymbol] = TASK_STOPED

    this.on(TASK_CHANGE_STATUS_EVENT, status => {
      this[statusSymbol] = status

      if (this[statusSymbol] === TASK_STARTING) {
        this.emit(TASK_CHANGE_STATUS_EVENT, TASK_PROCESSING)

        setImmediate(() => {
          this[lifeCycleSymbol]()
        })
      }
    })
  }

  /**
   * @param {Function} value
   */
  addStep(value) {
    if (typeof value === 'function') {
      const stepsCount = this[stepsSymbol].push(value)

      this.emit(TASK_ADDED_NEW_STEP_EVENT, stepsCount)

      if (this[statusSymbol] === TASK_STOPED) {
        this.emit(TASK_CHANGE_STATUS_EVENT, TASK_STARTING)
      }
    } else {
      throw new Error('Reactor.addStep: value is not a function')
    }
  }

  /**
   * @description
   *
   * @private
   *
   * @return {Promise}
   */
  async [lifeCycleSymbol]() {
    this.emit(REACTOR_STEP_START_EVENT)

    switch (this[statusSymbol]) {
      // exec task step function
      case TASK_PROCESSING: {
        if (this[stepsSymbol].length === 0) {
          this.emit(TASK_CHANGE_STATUS_EVENT, TASK_STOPED)

          return
        }

        const stepFunction = this[stepsSymbol].shift()

        try {
          await stepFunction()
        } catch (error) {
          this.emit(REACTOR_STEP_ERROR, error)
        }

        await delay(this.stepTimeout)

        this.emit(REACTOR_STEP_END_EVENT)

        setImmediate(() => {
          this[lifeCycleSymbol]()
        })

        return
      }

      case TASK_STOPING: {
        this.emit(TASK_CHANGE_STATUS_EVENT, TASK_STOPED)

        return;
      }

      case TASK_STOPED:
        return;
    }
  }
}

module.exports = {
  Reactor,
  TASK_CHANGE_STATUS_EVENT,
  REACTOR_STEP_START_EVENT,
  REACTOR_STEP_END_EVENT,
  REACTOR_STEP_ERROR,
  TASK_ADDED_NEW_STEP_EVENT,
  TASK_PROCESSING,
  TASK_STARTING,
  TASK_STOPING,
  TASK_STOPED,
}
