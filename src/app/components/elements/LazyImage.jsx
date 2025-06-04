import React, { Component } from 'react';
import PropTypes from 'prop-types';

class LazyImage extends Component {
    static propTypes = {
        src: PropTypes.string.isRequired,
        alt: PropTypes.string,
        className: PropTypes.string,
        placeholder: PropTypes.string,
        threshold: PropTypes.number,
        rootMargin: PropTypes.string,
        onLoad: PropTypes.func,
        onError: PropTypes.func,
    };

    static defaultProps = {
        alt: '',
        className: '',
        placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGNUY1RjUiLz48L3N2Zz4=',
        threshold: 0.1,
        rootMargin: '50px',
        onLoad: () => {},
        onError: () => {},
    };

    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            inView: false,
            error: false,
        };
        this.imgRef = React.createRef();
        this.observer = null;
    }

    componentDidMount() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection,
                {
                    threshold: this.props.threshold,
                    rootMargin: this.props.rootMargin,
                }
            );
            
            if (this.imgRef.current) {
                this.observer.observe(this.imgRef.current);
            }
        } else {
            // Fallback for browsers without IntersectionObserver
            this.setState({ inView: true });
        }
    }

    componentWillUnmount() {
        if (this.observer && this.imgRef.current) {
            this.observer.unobserve(this.imgRef.current);
        }
    }

    handleIntersection = (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
            this.setState({ inView: true });
            if (this.observer && this.imgRef.current) {
                this.observer.unobserve(this.imgRef.current);
            }
        }
    };

    handleLoad = () => {
        this.setState({ loaded: true });
        this.props.onLoad();
    };

    handleError = () => {
        this.setState({ error: true });
        this.props.onError();
    };

    render() {
        const { src, alt, className, placeholder, ...otherProps } = this.props;
        const { loaded, inView, error } = this.state;

        // Remove props that shouldn't be passed to img element
        delete otherProps.threshold;
        delete otherProps.rootMargin;
        delete otherProps.onLoad;
        delete otherProps.onError;

        const imgSrc = inView ? src : placeholder;
        const imgClassName = `lazy-image ${className} ${loaded ? 'loaded' : 'loading'} ${error ? 'error' : ''}`.trim();

        return (
            <img
                ref={this.imgRef}
                src={imgSrc}
                alt={alt}
                className={imgClassName}
                onLoad={this.handleLoad}
                onError={this.handleError}
                loading="lazy"
                {...otherProps}
            />
        );
    }
}

export default LazyImage;