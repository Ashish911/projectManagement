import {
    PREFERENCE_FETCH_REQUEST,
    PREFERENCE_FETCH_SUCCESS,
    PREFERENCE_FETCH_FAIL,
    PREFERENCE_UPDATE_REQUEST,
    PREFERENCE_UPDATE_SUCCESS,
    PREFERENCE_UPDATE_FAIL,
} from '../constants/preferenceConstants';
import type { Preference } from '@/api/preferenceApi';

interface PreferenceState {
    loading: boolean;
    saving: boolean;
    preference: Preference | null;
    error: string | null;
}

const initialState: PreferenceState = {
    loading: false,
    saving: false,
    preference: null,
    error: null,
};

export const preferenceReducer = (state = initialState, action: any): PreferenceState => {
    switch (action.type) {
        case PREFERENCE_FETCH_REQUEST:
            return { ...state, loading: true, error: null };
        case PREFERENCE_FETCH_SUCCESS:
            return { ...state, loading: false, preference: action.payload };
        case PREFERENCE_FETCH_FAIL:
            return { ...state, loading: false, error: action.payload };
        case PREFERENCE_UPDATE_REQUEST:
            return { ...state, saving: true, error: null };
        case PREFERENCE_UPDATE_SUCCESS:
            return { ...state, saving: false, preference: action.payload };
        case PREFERENCE_UPDATE_FAIL:
            return { ...state, saving: false, error: action.payload };
        default:
            return state;
    }
};
