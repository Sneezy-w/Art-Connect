import React, { createContext, useState, useContext, useMemo } from 'react';
import { Account, Databases, Client, Query, ID, OAuthProvider, Functions } from 'appwrite';
import { AppConfig } from '../../constants/config';
import useAsyncOnce from '../../hooks/useAsyncOnce';
import { useAsync, useLocalStorage, useAsyncFn } from 'react-use';
import { getCldImg, preloadImages } from '../../utils/cloudinary';


const AppContext = createContext();

export const useAppContext = (selector) => {
    const context = useContext(AppContext);

    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }

    return selector ? selector(context) : context;
};

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    //const [remoteCartItems, setRemoteCartItems] = useState([]);
    const [localCartItems, setLocalCartItems, removeLocalCartItems] = useLocalStorage('cartItems', []);
    //const [isLoadingCartItems, setIsLoadingCartItems] = useState(false);
    //const [refreshCart, setRefreshCart] = useState(0);




    const client = new Client()
        .setEndpoint(AppConfig.endpoint)
        .setProject(AppConfig.project);

    const account = new Account(client);
    const databases = new Databases(client);

    const checkUserState = useAsyncOnce(async () => {
        let session = undefined
        try {
            session = await account.get();
            setUser(session);
            //setRemoteCartItems(currentCartItems);
        } catch (error) {
            //console.error('User not logged in', error);
            return;
        }

        try {
            const currentCartItems = await fetchCartItems(session);
            if (localCartItems?.length > 0) {
                await Promise.all(localCartItems.map(async (localCartItem) => {

                    const foundCartItem = currentCartItems?.find(currentCartItem => currentCartItem.artwork?.$id === localCartItem.artwork?.$id)
                    if (foundCartItem) {
                        await databases.updateDocument(
                            AppConfig.databaseId,
                            AppConfig.cartItemsCollectionId,
                            foundCartItem.$id,
                            {
                                quantity: localCartItem.quantity + 1
                            });
                    } else {
                        await databases.createDocument(
                            AppConfig.databaseId,
                            AppConfig.cartItemsCollectionId,
                            ID.unique(),
                            {
                                userId: (session || user).$id,
                                quantity: localCartItem.quantity,
                                artwork: localCartItem.artwork.$id,
                            }
                        )
                    }
                }));
                removeLocalCartItems()
                await fetchCartItems(session);
            }
        } catch (error) {
            console.error('Failed to fetch cart items', error);
        }
    }, []);

    const categoriesState = useAsync(async () => {
        try {
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.categoriesCollectionId,
                [Query.orderAsc("sort")]
            );
            return response.documents;
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    }, []);

    const artworksState = useAsync(async () => {
        try {
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.artworksCollectionId,
                [Query.orderAsc("sort")]
            );
            const results = response.documents;
            await preloadImages([getCldImg(process.env.REACT_APP_HERO_IMAGE_ID, 1920), ...results.map((artwork) => getCldImg(artwork.imageId))]);
            return results;
        } catch (error) {
            console.error('Failed to fetch artworks', error);
        }
    }, []);

    const artistsState = useAsync(async () => {
        try {
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.artistsCollectionId,
                [Query.orderAsc("sort")]
            );
            const results = response.documents;
            await preloadImages(results.map((artist) => getCldImg(artist.pictureId)));
            return results;
        } catch (error) {
            console.error('Failed to fetch artists', error);
        }
    }, []);

    //const cartItemsState = use



    const loginWithGoogle = () => {
        try {
            account.createOAuth2Session(OAuthProvider.Google,
                process.env.REACT_APP_GOOGLE_OAUTH_REDIRECT_URL,
                process.env.REACT_APP_GOOGLE_OAUTH_REDIRECT_FAILURE_URL
            );
        } catch (error) {
            console.error('Google login failed', error);
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            //setRemoteCartItems([])
            setLocalCartItems([])
        } catch (error) {
            console.error('Logout failed', error);
        }
    };


    const [remoteCartItemsState, fetchCartItems] = useAsyncFn(async (session) => {
        try {
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.cartItemsCollectionId,
                [Query.equal("userId", (session || user).$id), Query.orderAsc("$createdAt")]
            );
            return response.documents;
        } catch (error) {
            console.error('Failed to fetch cart items', error);
            return [];
        }
    }, [user]);

    const cartItems = useMemo(() => {
        //console.log('cartItems', user, remoteCartItemsState?.value, localCartItems);
        return user ? remoteCartItemsState?.value || [] : localCartItems;
    }, [user, remoteCartItemsState, localCartItems]);

    const [addToCartState, addToCart] = useAsyncFn(async (artwork, quantity = 1) => {
        try {
            const cartItem = cartItems.find(item => item.artwork?.$id === artwork.$id);

            if (cartItem) {
                if (user) {
                    await databases.updateDocument(
                        AppConfig.databaseId,
                        AppConfig.cartItemsCollectionId,
                        cartItem.$id,
                        {
                            quantity: cartItem.quantity + quantity
                        }
                    )
                    await fetchCartItems();
                } else {
                    setLocalCartItems(() => {
                        //console.log('prevItems', prevItems);
                        return cartItems.map(item => item.artwork.$id === artwork.$id ? { ...item, quantity: item.quantity + quantity } : item)
                    });
                }
            } else {
                if (user) {
                    await databases.createDocument(
                        AppConfig.databaseId,
                        AppConfig.cartItemsCollectionId,
                        ID.unique(),
                        {
                            userId: user.$id,
                            quantity: quantity,
                            artwork: artwork.$id,
                        }
                    );
                    await fetchCartItems();
                } else {
                    setLocalCartItems(() => [...cartItems, { artwork: artwork, quantity: quantity }]);
                }
            }
        } catch (error) {
            console.error('Failed to add item to cart', error);
        }

    }, [user, cartItems]);


    const [removeFromCartState, removeFromCart] = useAsyncFn(async (cartItem) => {
        try {
            if (user) {
                await databases.deleteDocument(AppConfig.databaseId, AppConfig.cartItemsCollectionId, cartItem.$id);
                await fetchCartItems();
            } else {
                setLocalCartItems(() => cartItems.filter(item => item.artwork.$id !== cartItem.artwork.$id));
            }
        } catch (error) {
            console.error('Failed to remove item from cart', error);
        }
    }, [user, cartItems]);

    const [updateQuantityState, updateQuantity] = useAsyncFn(async (cartItem, quantity) => {
        try {
            if (user) {
                await databases.updateDocument(
                    AppConfig.databaseId,
                    AppConfig.cartItemsCollectionId,
                    cartItem.$id,
                    {
                        quantity: quantity
                    }
                );
                await fetchCartItems();
            } else {
                setLocalCartItems(() => cartItems.map(item => item.artwork.$id === cartItem.artwork.$id ? { ...item, quantity } : item));
            }
        } catch (error) {
            console.error('Failed to update quantity', error);
        }

    }, [user, cartItems]);

    const isLoadingCartItems = useMemo(() => {
        return remoteCartItemsState.loading || addToCartState.loading || removeFromCartState.loading || updateQuantityState.loading;
    }, [remoteCartItemsState, addToCartState, removeFromCartState, updateQuantityState]);

    const globalLoading = useMemo(() =>
        checkUserState.loading ||
        categoriesState.loading ||
        artworksState.loading ||
        artistsState.loading,
        [checkUserState.loading, categoriesState.loading, artworksState.loading, artistsState.loading]);

    // const sendEmail = async (formData) => {
    //     const functions = new Functions(client);
    //     try {
    //         const response = await functions.createExecution(
    //             process.env.REACT_APP_APPWRITE_EMAIL_FUNCTION_ID,
    //             JSON.stringify(formData)
    //         );
    //         if (response.status === 'completed' && JSON.parse(response.responseBody).success === true) {
    //             //console.log('Email sent successfully');
    //             //console.log('Email response:', response);
    //             return JSON.parse(response.responseBody);
    //         } else {
    //             throw new Error('Failed to send email');
    //         }
    //     } catch (error) {
    //         console.error('Error sending email:', error);
    //         throw error;
    //     }
    // };

    const sendEmail = async (formData) => {
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contact`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
          });
          
          if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit exceeded');
            } else {
                throw new Error('Failed to send email');
            }
          }
          
          return await response.json();
        } catch (error) {
          console.error('Error sending email:', error);
          throw error;
        }
      };

    const value = {
        user,
        cartItems,
        categoriesState,
        artworksState,
        artistsState,
        checkUserState,
        loginWithGoogle,
        logout,
        //fetchCartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        isLoadingCartItems,
        globalLoading,
        sendEmail
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};