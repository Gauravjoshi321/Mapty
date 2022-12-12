'use strict';


class Workout {
    date = new Date();
    id = (Date.now() + " ").slice(-10);
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.click++;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
    }
}
// const run = new Running([39, -12], 2, 13, 178);
// const cycle = new Cycling([39, -11.1], 2, 24, 150);
// const work = new Workout([39, -12], 2, 13);
// console.log(run, cycle, work);

// Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];
    #workoutE1;

    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from the local storage 
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPumpup.bind(this));
        containerWorkouts.addEventListener('dblclick', this._editWorkout.bind(this));
    }
    _getPosition() {
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            // console.log(this),
            function () {
                alert('Could not get your position coordinates');
            });

    }
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const { accuracy } = position.coords;
        console.log(accuracy);
        console.log(`https://www.google.co.in/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(this.#map);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        L.circle([latitude, longitude], { radius: accuracy }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm() {
        // Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
            '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);

    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
    _newWorkout(e) {
        // helper methods (field method)
        const validInputs = (...inputs) =>
            inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // get data from the form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;


        // if workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;

            // check if data is valid
            if (
                // Number.isFinite(distance) ||
                // Number.isFinite(duration) ||
                // Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return alert("Inputs have to be in positive number");

            workout = new Running([lat, lng], distance, duration, cadence);

        }
        // if workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            // check if data is valid
            if (!validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)
            )
                return alert("Inputs have to be in positive numbers");

            workout = new Cycling([lat, lng], distance, duration, elevation);
        };
        // Add new objects to the workout array
        this.#workouts.push(workout);

        // render workout on map as marker
        this._renderWorkoutMarker(workout);

        // render workout on list
        this._renderWorkout(workout);

        // Hide form + clear input fields
        this._hideForm();

        // // set local storage to all workouts
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                minWidth: 50,
                maxWidth: 300,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if (workout.type === 'running') {
            html +=
                `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
               </div>
               <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
               </div>
             `
        }

        if (workout.type === 'cycling') {
            html +=
                `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
              </div>
            </li> `
        }
        form.insertAdjacentHTML('afterend', html);
    }

    // move map to the desired location of our workouts
    _moveToPumpup(e) {
        // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
        if (!this.#map) return;

        const workoutE1 = e.target.closest('.workout');
        if (!workoutE1) return;

        const workout = this.#workouts.find(work => work.id === workoutE1.dataset.id);
        // console.log(workout);
        // now using the leaflet library method
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        })
        // using the public interface
        // workout.click();
    }
    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }


    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }
    _reset() {
        localStorage.removeItem('workouts');
        location.reload();
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    _editWorkout(e) {
        this.#workoutE1 = e.target.closest('.workout');
        if (!this.#workoutE1) return;

        const workout = this.#workouts.find(work => work.id === this.#workoutE1.dataset.id);

        this.#workouts.pop(workout);
        this._deleteWorkout();
        this._setLocalStorage();
        this._newForm();
    }
    _newForm() {
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _deleteWorkout() {
        containerWorkouts.removeChild(this.#workoutE1);
        ////
    }
    _sortWorkouts() {
        const work = JSON.parse(localStorage.getItem('workouts'));
        console.log(work);
        const map = work.map(dis => {
            return dis.distance;
        })
            .sort((a, b) => {
                return a - b;
            })
        console.log(map);
    }
}
const app = new App();
// console.log(app);


