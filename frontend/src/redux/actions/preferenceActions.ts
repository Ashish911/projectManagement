import {
    PREFERENCE_FETCH_REQUEST,
    PREFERENCE_FETCH_SUCCESS,
    PREFERENCE_FETCH_FAIL,
    PREFERENCE_UPDATE_REQUEST,
    PREFERENCE_UPDATE_SUCCESS,
    PREFERENCE_UPDATE_FAIL,
} from '../constants/preferenceConstants';
import { getPreference, updatePreference } from '@/api/preferenceApi';
import type { Preference } from '@/api/preferenceApi';

export const fetchPreference = () => async (dispatch: any) => {
    try {
        dispatch({ type: PREFERENCE_FETCH_REQUEST });
        const preference = await getPreference();
        dispatch({ type: PREFERENCE_FETCH_SUCCESS, payload: preference });
    } catch (error: any) {
        dispatch({
            type: PREFERENCE_FETCH_FAIL,
            payload: error.message,
        });
    }
};

export const savePreference = (data: Partial<Pick<Preference, 'theme' | 'language'>>) => async (dispatch: any) => {
    try {
        dispatch({ type: PREFERENCE_UPDATE_REQUEST });
        const updated = await updatePreference(data);
        dispatch({ type: PREFERENCE_UPDATE_SUCCESS, payload: updated });
        return true;
    } catch (error: any) {
        dispatch({
            type: PREFERENCE_UPDATE_FAIL,
            payload: error.message,
        });
        return false;
    }
};
